import { ethers } from "@deps";
import { devLog, logError } from "@utils";
import { ContractSource } from "./contract-source.ts";
import { BlockHandler } from "./block-handler.ts";
import { BlockHandlerFn, EventHandler, IManifest } from "@types";
import { Arkive } from "@types";

export class ManifestManager {
  private readonly manifest: IManifest;
  private contractSources: ContractSource[] = [];
  private blockHandlers: BlockHandler[] = [];
  private abiStore: Record<
    string,
    { name: string; interface: ethers.InterfaceAbi }
  > = {};
  private providerStore: Record<string, ethers.JsonRpcProvider> = {};
  private contractStore: Record<string, ethers.Contract> = {};
  private arkiveData: Arkive;
  private packagePath: string;

  constructor(manifest: IManifest, arkiveData: Arkive) {
    this.manifest = manifest;
    this.arkiveData = arkiveData;
    this.packagePath =
      `../packages/${this.arkiveData.user_id}/${this.arkiveData.id}/${this.arkiveData.deployment.major_version}_${this.arkiveData.deployment.minor_version}`;
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
            try {
              const provider = this.getProvider(
                dataSource.chain.rpcUrl,
                dataSource.chain.name,
              );

              const abi = await this.getAbi(contractSource.abiPath);

              const eventHandler = await this.getEventHandler(
                eventQuery.handler,
              );

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
                filter: eventQuery.filter,
                provider,
                contract,
                blockRange: dataSource.chain.blockRange,
                eventHandler,
                arkive: this.arkiveData,
              });

              await instance.init();

              this.contractSources.push(instance);
            } catch (e) {
              logError(e, { source: "ManifestManager.getContractSources" });
            }
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
          dataSource.chain.name,
        );

        const { name, fn } = await this.getBlockHandler(
          blockHandler.handlerPath,
        );

        const instance = new BlockHandler({
          provider,
          chainName: dataSource.chain.name,
          startBlockHeight: blockHandler.startBlockHeight,
          blockInterval: blockHandler.blockInterval,
          handler: fn,
          blockHandlerName: name,
          arkive: this.arkiveData,
        });

        await instance.init();

        this.blockHandlers.push(instance);
      }
    }

    return this.blockHandlers;
  }

  public async getCurrentBlockHeights(): Promise<
    Record<string, number> | null
  > {
    const blockHeights: Record<string, number> = {};

    for (const [chain, provider] of Object.entries(this.providerStore)) {
      try {
        blockHeights[chain] = await provider.getBlockNumber();
      } catch (e) {
        logError(e, { source: "ManifestManager.getCurrentBlockHeights" });
        return null;
      }
    }

    devLog(`current block heights: ${JSON.stringify(blockHeights)}`);

    return blockHeights;
  }

  private async getBlockHandler(
    handlerPath: string,
  ): Promise<{ fn: BlockHandlerFn; name: string }> {
    const handler = (await import(`${this.packagePath}/${handlerPath}`))
      .default;
    const name = handlerPath.split("/").pop()?.split(".")[0] ?? handlerPath;

    return { fn: handler, name };
  }

  private async getAbi(
    abiPath: string,
  ): Promise<{ interface: ethers.InterfaceAbi; name: string }> {
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
    chain: string,
  ): ethers.JsonRpcProvider {
    if (this.providerStore[chain]) {
      return this.providerStore[chain];
    }

    this.providerStore[chain] = new ethers.JsonRpcProvider(rpcUrl);
    return this.providerStore[chain];
  }

  private getContract(params: {
    chain: string;
    address: string;
    abi: ethers.InterfaceAbi;
    provider: ethers.JsonRpcProvider;
  }): ethers.Contract {
    const key = `${params.address}-${params.chain}`;
    if (this.contractStore[key]) {
      return this.contractStore[key];
    }

    this.contractStore[key] = new ethers.Contract(
      params.address,
      params.abi,
      params.provider,
    );
    return this.contractStore[key];
  }

  private async getEventHandler(handlerPath: string): Promise<EventHandler> {
    const handler = (await import(`${this.packagePath}/${handlerPath}`))
      .default;
    return handler;
  }
}
