import { Arkive, IManifest } from "@types";
import { delay, logError } from "@utils";
import { BlockHandler } from "./block-handler.ts";
import { ContractSource } from "./contract-source.ts";
import { ManifestManager } from "./manifest-manager.ts";

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
    try {
      await this.manifestManager.init();
      const store = {};
      let blockHeights: Record<string, number> = {};
      while (this.running) {
        blockHeights = await this.manifestManager
          .getCurrentBlockHeights() ?? blockHeights;
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
    } catch (e) {
      logError(e, { source: "Arkiver.run" });
    }
  }

  public stop() {
    this.running = false;
  }

  // call isLive() on each contract source and block handler and return true if all return true
  private checkIsLive(
    contractSources: ContractSource[],
    blockHandlers: BlockHandler[],
    blockHeights: Record<string, number>,
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
    contractSources: ContractSource[],
  ) {
    try {
      // get data Points for each contract source and log them
      contractSources.forEach((contractSource) => {
        const currentBlockHeight = blockHeights[contractSource.chain];
        if (!currentBlockHeight) return;
        contractSource.getDataPoints(
          currentBlockHeight,
          store,
          (dataPoints) =>
            dataPoints.forEach((point) => console.log(point.toLineProtocol())),
        );
      });
    } catch (e) {
      logError(e as Error, { source: "Service.processContractSources" });
    }
  }

  private processBlockHandlers(
    store: Record<string, unknown>,
    blockHeights: Record<string, number>,
    blockHandlers: BlockHandler[],
  ) {
    try {
      // get data Points for each block handler and log them
      blockHandlers.forEach((blockHandler) => {
        const currentBlockHeight = blockHeights[blockHandler.chain];
        blockHandler.getDataPoints(
          currentBlockHeight,
          store,
          (dataPoints) =>
            dataPoints.forEach((point) => console.log(point.toLineProtocol())),
        );
      });
    } catch (e) {
      logError(e as Error, { source: "Service.processBlockHandlers" });
    }
  }
}
