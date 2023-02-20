import { ethers, Point } from "@deps";
import { logError } from "@utils";
import { Arkive, BlockHandlerFn } from "@types";

export class BlockHandler {
  private readonly chainName: string;
  public startBlockHeight: number;
  public readonly blockInterval: number;
  private readonly handler: BlockHandlerFn;
  private readonly blockHandlerName: string;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly arkive: Arkive;

  constructor(params: {
    chainName: string;
    startBlockHeight: number;
    blockInterval: number;
    handler: BlockHandlerFn;
    blockHandlerName: string;
    provider: ethers.JsonRpcProvider;
    arkive: Arkive;
  }) {
    this.chainName = params.chainName;
    this.startBlockHeight = params.startBlockHeight;
    this.blockInterval = params.blockInterval;
    this.handler = params.handler;
    this.blockHandlerName = params.blockHandlerName;
    this.provider = params.provider;
    this.arkive = params.arkive;
  }

  public getDataPoints(
    store: Record<string, unknown>,
    callback: (points: Point[]) => void,
  ): void {
    try {
      this.fetchAndHandleBlocks(this.startBlockHeight, store).then((data) => {
        if (data === null) {
          return; // don't increment startBlockHeight
        }
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
  ): Promise<Point[] | null> {
    try {
      const block = await this.provider.getBlock(
        startBlockHeight,
        true,
      );
      if (!block) {
        return null;
      }
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
