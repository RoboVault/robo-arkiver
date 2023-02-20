import { ethers } from "@deps";
import { delay, devLog, getEnv, logError } from "@utils";
import { ContractSource } from "./contract-source.ts";
import { BlockHandler } from "./block-handler.ts";
import { BlockHandlerFn, EventHandler, IManifest } from "@types";
import { Arkive } from "@types";
import { StatusProvider } from "../providers/types.ts";
import { InfluxDBAdapter } from "../providers/influxdb.ts";
import { mockStatusProvider } from "../providers/mock.ts";

export class Arkiver extends EventTarget {
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
  private processedBlockHeights = new Map<string, number>();
  private liveBlockHeights: Record<string, number> = {};
  private store: Record<string, unknown> = {};
  private running = true;
  private isLive = false;
  private delayMs = 2000;
  private readonly statusProvider: StatusProvider;
  private blockRanges = new Map<string, number>();

  constructor(manifest: IManifest, arkiveData: Arkive) {
    super();
    this.manifest = manifest;
    this.arkiveData = arkiveData;
    this.packagePath =
      `../packages/${this.arkiveData.user_id}/${this.arkiveData.id}/${this.arkiveData.deployment.major_version}_${this.arkiveData.deployment.minor_version}`;
    if (getEnv("DENO_ENV") === "PROD") {
      this.statusProvider = new InfluxDBAdapter({
        url: getEnv("INFLUX_HOST"),
        token: getEnv("INFLUX_TOKEN"),
        bucket: getEnv("INFLUX_BUCKET"),
        org: getEnv("INFLUX_ORG"),
      });
    } else {
      this.statusProvider = mockStatusProvider;
    }
  }

  public async init() {
    console.log("initializing arkiver");
    await this.getContractSources();
    await this.getBlockHandlers();
    await this.checkIndexedBlockHeights();
  }

  public async run() {
    console.log("running arkiver");
    try {
      while (this.running) {
        this.liveBlockHeights = await this.getLiveBlockHeights() ??
          this.liveBlockHeights;
        this.processContractSources();
        this.processBlockHandlers();
        if (
          !this.isLive &&
          this.checkIsLive()
        ) {
          this.delayMs = 2000;
          this.isLive = true;
          this.dispatchEvent(new Event("synced"));
        }
        await delay(this.delayMs);
      }
    } catch (e) {
      logError(e, { source: "Arkiver.run" });
    }
  }

  public stop() {
    this.running = false;
  }

  // call isLive() on each contract source and block handler and return true if all return true
  private checkIsLive() {
    return (
      this.contractSources.every((contractSource) =>
        contractSource.isLive(this.liveBlockHeights[contractSource.chain])
      ) &&
      this.blockHandlers.every((blockHandler) =>
        blockHandler.isLive(this.liveBlockHeights[blockHandler.chain])
      )
    );
  }

  private async checkIndexedBlockHeights() {
    for (const [chain, processedBlockHeight] of this.processedBlockHeights) {
      const indexedBlockHeight = await this.statusProvider
        .getIndexedBlockHeight({
          _chain: chain,
          _arkiveId: this.arkiveData.id.toString(),
          _arkiveVersion: this.arkiveData.deployment.major_version.toString(),
        });

      devLog(
        "indexedBlockHeight",
        indexedBlockHeight,
        chain,
      );

      if (indexedBlockHeight && indexedBlockHeight > processedBlockHeight) {
        this.processedBlockHeights.set(chain, indexedBlockHeight);
      }
    }
  }

  private processContractSources() {
    try {
      // get data Points for each contract source and log them
      this.contractSources.forEach((contractSource) => {
        const processedBlockHeight = this.processedBlockHeights.get(
          contractSource.chain,
        );
        if (!processedBlockHeight) {
          throw new Error(
            `No indexed block height for chain ${contractSource.chain}`,
          );
        }

        const blockRange = this.blockRanges.get(contractSource.chain);
        if (!blockRange) {
          throw new Error(
            `No block range for chain ${contractSource.chain}`,
          );
        }

        const sourceBlockHeight = contractSource.startBlockHeight;

        // haven't reached the start block height yet
        if (processedBlockHeight + blockRange < sourceBlockHeight) {
          return;
        }

        const liveBlockHeight = this.liveBlockHeights[contractSource.chain];
        if (!liveBlockHeight) return;

        const from = Math.min(processedBlockHeight + 1, liveBlockHeight);
        const to = Math.min(
          processedBlockHeight + blockRange,
          liveBlockHeight,
        );

        if (from >= to) return;

        contractSource.getDataPoints(
          from,
          to,
          this.store,
          (dataPoints) =>
            dataPoints.forEach((point) => console.log(point.toLineProtocol())),
        );
      });
    } catch (e) {
      logError(e as Error, { source: "Service.processContractSources" });
    }
  }

  private processBlockHandlers() {
    try {
      // get data Points for each block handler and log them
      this.blockHandlers.forEach((blockHandler) => {
        const processedBlockHeight = this.processedBlockHeights.get(
          blockHandler.chain,
        );
        if (!processedBlockHeight) {
          throw new Error(
            `No indexed block height for chain ${blockHandler.chain}`,
          );
        }

        // haven't reached the start block height yet
        while (processedBlockHeight > blockHandler.startBlockHeight) {
          blockHandler.getDataPoints(
            this.store,
            (dataPoints) =>
              dataPoints.forEach((point) =>
                console.log(point.toLineProtocol())
              ),
          );
        }
      });
    } catch (e) {
      logError(e as Error, { source: "Service.processBlockHandlers" });
    }
  }

  public async getContractSources(): Promise<ContractSource[]> {
    if (this.contractSources.length > 0) {
      return this.contractSources;
    }

    for (const dataSource of this.manifest.dataSources) {
      if (!dataSource.contracts) {
        continue;
      }

      if (!this.blockRanges.has(dataSource.chain.name)) {
        this.blockRanges.set(
          dataSource.chain.name,
          dataSource.chain.blockRange,
        );
      }

      for (const contractSource of dataSource.contracts) {
        for (const source of contractSource.sources) {
          // set the starting point for each chain to the lowest startBlockHeight of all contract sources
          const startBlockHeight =
            this.processedBlockHeights.get(dataSource.chain.name) || 0;
          if (
            startBlockHeight === 0 || source.startBlockHeight < startBlockHeight
          ) {
            this.processedBlockHeights.set(
              dataSource.chain.name,
              source.startBlockHeight,
            );
          }

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

      if (!this.blockRanges.has(dataSource.chain.name)) {
        this.blockRanges.set(
          dataSource.chain.name,
          dataSource.chain.blockRange,
        );
      }

      for (const blockHandler of dataSource.blockHandlers) {
        // set the starting point for each chain to the lowest startBlockHeight of all contract sources
        const startBlockHeight =
          this.processedBlockHeights.get(dataSource.chain.name) || 0;
        if (
          startBlockHeight === 0 ||
          blockHandler.startBlockHeight < startBlockHeight
        ) {
          this.processedBlockHeights.set(
            dataSource.chain.name,
            blockHandler.startBlockHeight,
          );
        }

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

        this.blockHandlers.push(instance);
      }
    }

    return this.blockHandlers;
  }

  public async getLiveBlockHeights(): Promise<
    Record<string, number> | null
  > {
    const blockHeights: Record<string, number> = {};

    for (const [chain, provider] of Object.entries(this.providerStore)) {
      try {
        blockHeights[chain] = await provider.getBlockNumber();
      } catch (e) {
        logError(e, { source: "ManifestManager.getLiveBlockHeights" });
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
