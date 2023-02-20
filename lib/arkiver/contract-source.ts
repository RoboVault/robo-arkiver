import { ethers, Point } from "@deps";
import { devLog, logError, timeout } from "@utils";
import { Arkive, EventHandler, Filter } from "@types";

export class ContractSource {
  private readonly abiName: string;
  private readonly chainName: string;
  public startBlockHeight: number;
  private readonly eventQuery: string;
  private readonly contract: ethers.Contract;
  private readonly eventHandler: EventHandler;
  private readonly arkive: Arkive;
  private readonly filter?: Filter;
  private readonly provider: ethers.JsonRpcProvider;

  constructor(params: {
    abiName: string;
    chainName: string;
    startBlockHeight: number;
    eventQuery: string;
    filter?: Filter;
    contract: ethers.Contract;
    provider: ethers.JsonRpcProvider;
    blockRange: number;
    eventHandler: EventHandler;
    arkive: Arkive;
  }) {
    this.abiName = params.abiName;
    this.chainName = params.chainName;
    this.startBlockHeight = params.startBlockHeight;
    this.eventQuery = params.eventQuery;
    this.filter = params.filter;
    this.contract = params.contract;
    this.provider = params.provider;
    this.eventHandler = params.eventHandler;
    this.arkive = params.arkive;
  }

  public getDataPoints(
    from: number,
    to: number,
    store: Record<string, unknown>,
    callback: (points: Point[]) => void,
  ): void {
    const filterFn = this.contract.filters[this.eventQuery];
    if (!filterFn) {
      throw new Error(`Event query ${this.eventQuery} not found`);
    }
    const filter = filterFn(this.filter);

    try {
      this.fetchAndHandleEvents(from, to, filter, store).then((data) => {
        callback(data);
      });
    } catch (e) {
      logError(e as Error, {
        abiName: this.abiName,
        eventQuery: this.eventQuery,
        contractAddress: this.contract.target.toString(),
        source: "ContractSource.getDataPoints",
      });
    }
  }

  public isLive(currentBlockHeight: number): boolean {
    return this.startBlockHeight >= currentBlockHeight;
  }

  private async fetchAndHandleEvents(
    from: number,
    to: number,
    filter: ethers.DeferredTopicFilter,
    store: Record<string, unknown>,
  ): Promise<Point[]> {
    try {
      const events = await this.contract.queryFilter(filter, from, to);

      devLog(
        `fetching data from ${this.abiName} ${this.eventQuery} ${this.contract.target.toString()} from ${from} to ${to}`,
      );

      const points = (
        await Promise.all(
          events.map(async (event) => {
            const timestampMs = (await event.getBlock()).timestamp * 1000;
            const pointsPromise = this.eventHandler({
              event,
              contract: this.contract,
              chainName: this.chainName,
              abiName: this.abiName,
              eventQueryName: this.eventQuery,
              store,
              timestampMs,
              provider: this.provider,
            });
            const points = await Promise.race([pointsPromise, timeout(10000)]);
            return points.map((point) => {
              return point
                .tag("_chain", this.chainName)
                .tag("_address", this.contract.target.toString())
                .tag("_event", this.eventQuery)
                .tag("_abi", this.abiName)
                .tag(
                  "_arkiveVersion",
                  this.arkive.deployment.major_version.toString(),
                )
                .tag("_arkiveId", this.arkive.id.toString())
                .tag("_logIndex", event.index.toString())
                .stringField("_txHash", event.transactionHash)
                .intField("_blockHeight", event.blockNumber)
                .timestamp(new Date(timestampMs));
            });
          }),
        )
      ).flat();

      return points;
    } catch (e) {
      logError(e as Error, {
        abiName: this.abiName,
        eventQuery: this.eventQuery,
        contractAddress: this.contract.target.toString(),
        source: "ContractSource.fetchAndHandleEvents",
      });
      return [];
    }
  }

  public get chain(): string {
    return this.chainName;
  }
}
