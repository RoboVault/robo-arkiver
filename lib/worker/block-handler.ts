import { ethers, Point } from "../../deps.ts";
import { Measurement } from "./influx.ts";
import { devLog, logError } from "./utils.ts";
import { BlockHandlerFn } from "./types.ts";

export class BlockHandler {
  private readonly chainName: string;
  private startBlockHeight: number;
  private readonly blockInterval: number;
  private readonly handler: BlockHandlerFn;
  private readonly blockHandlerName: string;
  private readonly provider: ethers.providers.JsonRpcProvider;

  constructor(params: {
    chainName: string;
    startBlockHeight: number;
    blockInterval: number;
    handler: BlockHandlerFn;
    blockHandlerName: string;
    provider: ethers.providers.JsonRpcProvider;
  }) {
    this.chainName = params.chainName;
    this.startBlockHeight = params.startBlockHeight;
    this.blockInterval = params.blockInterval;
    this.handler = params.handler;
    this.blockHandlerName = params.blockHandlerName;
    this.provider = params.provider;
  }

  public async init() {
    await this.checkIndexedBlockHeight();
  }

  private async checkIndexedBlockHeight() {
    const measurement = new Measurement();

    const indexedBlockHeight = await measurement.getLastValue({
      field: "blockHeight",
      range: { start: new Date(0), end: new Date() },
      filters: {
        chain: this.chainName,
        blockHandler: this.blockHandlerName,
      },
      groupKeys: ["chain", "blockHandler"],
    });

    devLog("indexedBlockHeight", indexedBlockHeight, this.blockHandlerName);

    if (indexedBlockHeight && indexedBlockHeight > this.startBlockHeight) {
      this.startBlockHeight = indexedBlockHeight;
    }
  }

  public getDataPoints(
    currentBlockHeight: number,
    store: Record<string, unknown>,
    callback: (points: Point[]) => void
  ): void {
    if (this.startBlockHeight > currentBlockHeight) {
      return;
    }
    try {
      this.fetchAndHandleBlocks(this.startBlockHeight, store).then((data) => {
        callback(data);
      });
    } catch (e) {
      logError(e as Error, {
        blockHandlerName: this.blockHandlerName,
        source: "BlockHandler.getDataPoints",
      });
    }
    this.startBlockHeight += this.blockInterval;
  }

  public isLive(currentBlockHeight: number): boolean {
    return this.startBlockHeight >= currentBlockHeight;
  }

  private async fetchAndHandleBlocks(
    startBlockHeight: number,
    store: Record<string, unknown>
  ): Promise<Point[]> {
    try {
      const block = await this.provider.getBlock(startBlockHeight);
      const points = await this.handler({
        block,
        store,
        blockHandlerName: this.blockHandlerName,
        chainName: this.chainName,
        provider: this.provider,
      });
      return points;
    } catch (e) {
      logError(e as Error, {
        blockHandlerName: this.blockHandlerName,
        source: "BlockHandler.fetchAndHandleBlocks",
      });
      return [];
    }
  }

  public get chain(): string {
    return this.chainName;
  }
}
