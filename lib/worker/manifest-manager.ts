import { ethers } from "../../deps.ts";
import { devLog } from "./utils.ts";
import { ContractSource } from "./contract-source.ts";
import { BlockHandler } from "./block-handler.ts";
import { IManifest, BlockHandlerFn, EventHandler } from "./types.ts";
import { Arkive } from "../types.ts";

export class ManifestManager {
  private readonly manifest: IManifest;
  private contractSources: ContractSource[] = [];
  private blockHandlers: BlockHandler[] = [];
  private abiStore: Record<
    string,
    { name: string; interface: ethers.ContractInterface }
  > = {};
  private providerStore: Record<string, ethers.providers.JsonRpcProvider> = {};
  private contractStore: Record<string, ethers.Contract> = {};
  private arkiveData: Arkive;
  private packagePath: string;

  constructor(manifest: IManifest, arkiveData: Arkive) {
    this.manifest = manifest;
    this.arkiveData = arkiveData;
    this.packagePath = `../packages/${this.arkiveData.owner_id}/${this.arkiveData.name}/${this.arkiveData.version_number}`;
  }

  public async init() {
    await this.getContractSources();
  }

  public async getContractSources(): Promise<ContractSource[]> {
    if (this.contractSources.length > 0) {
      return this.contractSources;
    }

    for (const dataSource of this.manifest.dataSources) {
      if (!dataSource.contracts) {
        continue;
      }

      for (const contractSource of dataSource.contracts) {
        for (const source of contractSource.sources) {
          for (const eventQuery of contractSource.eventQueries) {
            const provider = this.getProvider(
              dataSource.chain.rpcUrl,
              dataSource.chain.name
            );

            const abi = await this.getAbi(contractSource.abiPath);

            const eventHandler = await this.getEventHandler(eventQuery.handler);

            const contract = this.getContract({
              abi: abi.interface,
              address: source.address,
              provider,
              chain: dataSource.chain.name,
            });

            const instance = new ContractSource({
              abiName: abi.name,
              chainName: dataSource.chain.name,
              startBlockHeight: source.startBlockHeight - 1,
              eventQuery: eventQuery.name,
              contract,
              blockRange: dataSource.chain.blockRange,
              eventHandler,
            });

            await instance.init();

            this.contractSources.push(instance);
          }
        }
      }
    }

    return this.contractSources;
  }

  public async getBlockHandlers(): Promise<BlockHandler[]> {
    if (this.blockHandlers.length > 0) {
      return this.blockHandlers;
    }

    for (const dataSource of this.manifest.dataSources) {
      if (!dataSource.blockHandlers) {
        continue;
      }

      for (const blockHandler of dataSource.blockHandlers) {
        const provider = this.getProvider(
          dataSource.chain.rpcUrl,
          dataSource.chain.name
        );

        const { name, fn } = await this.getBlockHandler(
          blockHandler.handlerPath
        );

        const instance = new BlockHandler({
          provider,
          chainName: dataSource.chain.name,
          startBlockHeight: blockHandler.startBlockHeight,
          blockInterval: blockHandler.blockInterval,
          handler: fn,
          blockHandlerName: name,
        });

        await instance.init();

        this.blockHandlers.push(instance);
      }
    }

    return this.blockHandlers;
  }

  public async getCurrentBlockHeights(): Promise<Record<string, number>> {
    const blockHeights: Record<string, number> = {};

    for (const [chain, provider] of Object.entries(this.providerStore)) {
      blockHeights[chain] = await provider.getBlockNumber();
    }

    devLog(`current block heights: ${JSON.stringify(blockHeights)}`);

    return blockHeights;
  }

  private async getBlockHandler(
    handlerPath: string
  ): Promise<{ fn: BlockHandlerFn; name: string }> {
    const handler = (await import(`${this.packagePath}/${handlerPath}`))
      .default;
    const name = handlerPath.split("/").pop()?.split(".")[0] ?? handlerPath;

    return { fn: handler, name };
  }

  private async getAbi(
    abiPath: string
  ): Promise<{ interface: ethers.ContractInterface; name: string }> {
    if (this.abiStore[abiPath]) {
      return this.abiStore[abiPath];
    }
    const abi = (
      await import(`${this.packagePath}/${abiPath}`, {
        assert: { type: "json" },
      })
    ).default;
    const name = abiPath.split("/").pop()?.split(".")[0] ?? "abiPath";

    this.abiStore[abiPath] = { interface: abi, name };

    return this.abiStore[abiPath];
  }

  private getProvider(
    rpcUrl: string,
    chain: string
  ): ethers.providers.JsonRpcProvider {
    if (this.providerStore[chain]) {
      return this.providerStore[chain];
    }

    this.providerStore[chain] = new ethers.providers.JsonRpcProvider(rpcUrl);
    return this.providerStore[chain];
  }

  private getContract(params: {
    chain: string;
    address: string;
    abi: ethers.ContractInterface;
    provider: ethers.providers.JsonRpcProvider;
  }): ethers.Contract {
    const key = `${params.address}-${params.chain}`;
    if (this.contractStore[key]) {
      return this.contractStore[key];
    }

    this.contractStore[key] = new ethers.Contract(
      params.address,
      params.abi as ethers.ContractInterface,
      params.provider
    );
    return this.contractStore[key];
  }

  private async getEventHandler(handlerPath: string): Promise<EventHandler> {
    const handler = (await import(`${this.packagePath}/${handlerPath}`))
      .default;
    return handler;
  }
}
