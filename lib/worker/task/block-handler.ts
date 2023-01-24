import { ethers, Point } from "../../../deps.ts";
import { devLog, getEnv, logError } from "../../utils.ts";
import { BlockHandlerFn } from "../../types.ts";
import { StatusProvider } from "../../providers/types.ts";
import { InfluxDBAdapter } from "../../providers/influxdb.ts";
import { mockStatusProvider } from "../../providers/mock.ts";

export class BlockHandler {
  private readonly chainName: string;
  private startBlockHeight: number;
  private readonly blockInterval: number;
  private readonly handler: BlockHandlerFn;
  private readonly blockHandlerName: string;
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly statusProvider: StatusProvider;

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
    if (getEnv("DENO_ENV") === "PROD") {
      this.statusProvider = new InfluxDBAdapter({
        url: getEnv("INFLUXDB_URL"),
        token: getEnv("INFLUXDB_TOKEN"),
        bucket: getEnv("INFLUXDB_BUCKET"),
        org: getEnv("INFLUXDB_ORG"),
      });
    } else {
      this.statusProvider = mockStatusProvider;
    }
  }

  public async init() {
    await this.checkIndexedBlockHeight();
  }

  private async checkIndexedBlockHeight() {
    const indexedBlockHeight = await this.statusProvider.getIndexedBlockHeight({
      type: "blockHandler",
      chain: this.chainName,
      blockHandler: this.blockHandlerName,
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
