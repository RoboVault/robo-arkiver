import { ArkiveMessageEvent, IManifest } from "../types.ts";
import { ManifestManager } from "./manifest-manager.ts";
import { delay, devLog, logError } from "../utils.ts";
import { ContractSource } from "./contract-source.ts";
import { BlockHandler } from "./block-handler.ts";
import { Arkive } from "../types.ts";

declare const self: Worker;
devLog("worker started");

self.onmessage = (e: MessageEvent<ArkiveMessageEvent>) => {
  devLog("worker received message", e.data);
  switch (e.data.topic) {
    case "initArkive": {
      const { arkive, manifest } = e.data.data;
      devLog("initializing arkive", arkive);
      const arkiver = new Arkiver(manifest, arkive);
      arkiver.addEventListener("synced", () => {
        self.postMessage({ topic: "synced", data: { arkive } });
      });
      arkiver.run();
      break;
    }
  }
};

export class Arkiver extends EventTarget {
  private manifestManager: ManifestManager;
  private running = true;
  private delayMs = 200;
  private isLive = false;

  constructor(manifest: IManifest, arkiveData: Arkive) {
    super();
    this.manifestManager = new ManifestManager(manifest, arkiveData);
  }

  public async run() {
    await this.manifestManager.init();
    const store = {};
    while (this.running) {
      const blockHeights = await this.manifestManager.getCurrentBlockHeights();
      const contractSources = await this.manifestManager.getContractSources();
      const blockHandlers = await this.manifestManager.getBlockHandlers();
      this.processContractSources(store, blockHeights, contractSources);
      this.processBlockHandlers(store, blockHeights, blockHandlers);
      if (
        !this.isLive &&
        this.checkIsLive(contractSources, blockHandlers, blockHeights)
      ) {
        this.delayMs = 2000;
        this.isLive = true;
        this.dispatchEvent(new Event("synced"));
      }
      await delay(this.delayMs);
    }
  }

  public stop() {
    this.running = false;
  }

  // call isLive() on each contract source and block handler and return true if all return true
  private checkIsLive(
    contractSources: ContractSource[],
    blockHandlers: BlockHandler[],
    blockHeights: Record<string, number>
  ) {
    return (
      contractSources.every((contractSource) =>
        contractSource.isLive(blockHeights[contractSource.chain])
      ) &&
      blockHandlers.every((blockHandler) =>
        blockHandler.isLive(blockHeights[blockHandler.chain])
      )
    );
  }

  private processContractSources(
    store: Record<string, unknown>,
    blockHeights: Record<string, number>,
    contractSources: ContractSource[]
  ) {
    try {
      // get data Points for each contract source and log them
      contractSources.forEach((contractSource) => {
        const currentBlockHeight = blockHeights[contractSource.chain];
        contractSource.getDataPoints(currentBlockHeight, store, (dataPoints) =>
          dataPoints.forEach((point) => console.log(point.toLineProtocol()))
        );
      });
    } catch (e) {
      logError(e as Error, { source: "Service.processContractSources" });
    }
  }

  private processBlockHandlers(
    store: Record<string, unknown>,
    blockHeights: Record<string, number>,
    blockHandlers: BlockHandler[]
  ) {
    try {
      // get data Points for each block handler and log them
      blockHandlers.forEach((blockHandler) => {
        const currentBlockHeight = blockHeights[blockHandler.chain];
        blockHandler.getDataPoints(currentBlockHeight, store, (dataPoints) =>
          dataPoints.forEach((point) => console.log(point.toLineProtocol()))
        );
      });
    } catch (e) {
      logError(e as Error, { source: "Service.processBlockHandlers" });
    }
  }
}
