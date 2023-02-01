import { ethers, Point } from "@deps";
import { devLog, getEnv, logError } from "../utils.ts";
import { Arkive, BlockHandlerFn } from "../types.ts";
import { StatusProvider } from "../providers/types.ts";
import { InfluxDBAdapter } from "../providers/influxdb.ts";
import { mockStatusProvider } from "../providers/mock.ts";

export class BlockHandler {
  private readonly chainName: string;
  private startBlockHeight: number;
  private readonly blockInterval: number;
  private readonly handler: BlockHandlerFn;
  private readonly blockHandlerName: string;
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly statusProvider: StatusProvider;
  private readonly arkive: Arkive;

  constructor(params: {
    chainName: string;
    startBlockHeight: number;
    blockInterval: number;
    handler: BlockHandlerFn;
    blockHandlerName: string;
    provider: ethers.providers.JsonRpcProvider;
    arkive: Arkive;
  }) {
    this.chainName = params.chainName;
    this.startBlockHeight = params.startBlockHeight;
    this.blockInterval = params.blockInterval;
    this.handler = params.handler;
    this.blockHandlerName = params.blockHandlerName;
    this.provider = params.provider;
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
    this.arkive = params.arkive;
  }

  public async init() {
    await this.checkIndexedBlockHeight();
  }

  private async checkIndexedBlockHeight() {
    const indexedBlockHeight = await this.statusProvider.getIndexedBlockHeight({
      type: "blockHandler",
      _blockHandler: this.blockHandlerName,
      _chain: this.chainName,
      _arkiveVersion: this.arkive.deployment.major_version.toString(),
      _arkiveId: this.arkive.id.toString(),
    });

    devLog("indexedBlockHeight", indexedBlockHeight, this.blockHandlerName);

    if (indexedBlockHeight && indexedBlockHeight > this.startBlockHeight) {
      this.startBlockHeight = indexedBlockHeight;
    }
  }

  public getDataPoints(
    currentBlockHeight: number,
    store: Record<string, unknown>,
    callback: (points: Point[]) => void,
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
    store: Record<string, unknown>,
  ): Promise<Point[]> {
    try {
      const block = await this.provider.getBlock(startBlockHeight);
      const timestampMs = block.timestamp * 1000;
      const points = await this.handler({
        block,
        store,
        blockHandlerName: this.blockHandlerName,
        chainName: this.chainName,
        provider: this.provider,
        timestampMs,
      });
      return points.map((point) => {
        return point
          .tag("_chain", this.chainName)
          .tag("_blockHandler", this.blockHandlerName)
          .tag(
            "_arkiveVersion",
            this.arkive.deployment.major_version.toString(),
          )
          .tag("_arkiveId", this.arkive.id.toString())
          .intField("_blockHeight", block.number)
          .timestamp(new Date(timestampMs));
      });
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
