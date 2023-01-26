import { ethers, Point } from "../../deps.ts";
import { devLog, getEnv, logError } from "../utils.ts";
import { EventHandler } from "../types.ts";
import { StatusProvider } from "../providers/types.ts";
import { InfluxDBAdapter } from "../providers/influxdb.ts";
import { mockStatusProvider } from "../providers/mock.ts";

export class ContractSource {
  private readonly abiName: string;
  private readonly chainName: string;
  private startBlockHeight: number;
  private readonly eventQuery: string;
  private readonly contract: ethers.Contract;
  private readonly blockRange: number;
  private readonly eventHandler: EventHandler;
  private readonly statusProvider: StatusProvider;

  constructor(params: {
    abiName: string;
    chainName: string;
    startBlockHeight: number;
    eventQuery: string;
    contract: ethers.Contract;
    blockRange: number;
    eventHandler: EventHandler;
  }) {
    this.abiName = params.abiName;
    this.chainName = params.chainName;
    this.startBlockHeight = params.startBlockHeight;
    this.eventQuery = params.eventQuery;
    this.contract = params.contract;
    this.blockRange = params.blockRange;
    this.eventHandler = params.eventHandler;
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
      type: "eventHandler",
      address: this.contract.address,
      chain: this.chainName,
      eventName: this.eventQuery,
    });

    devLog(
      "indexedBlockHeight",
      indexedBlockHeight,
      this.contract.address,
      this.eventQuery
    );

    if (indexedBlockHeight && indexedBlockHeight > this.startBlockHeight) {
      this.startBlockHeight = indexedBlockHeight;
    }
  }

  public getDataPoints(
    currentBlockHeight: number,
    store: Record<string, unknown>,
    callback: (points: Point[]) => void
  ): void {
    const filterFn = this.contract.filters[this.eventQuery];
    if (!filterFn) {
      throw new Error(`Event query ${this.eventQuery} not found`);
    }
    const filter = filterFn();

    const from = Math.min(this.startBlockHeight + 1, currentBlockHeight);
    const to = Math.min(
      currentBlockHeight,
      this.startBlockHeight + this.blockRange
    );

    if (from === to) {
      return;
    }
    this.startBlockHeight = to;
    try {
      this.fetchAndHandleEvents(from, to, filter, store).then((data) => {
        callback(data);
      });
    } catch (e) {
      logError(e as Error, {
        abiName: this.abiName,
        eventQuery: this.eventQuery,
        contractAddress: this.contract.address,
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
    filter: ethers.EventFilter,
    store: Record<string, unknown>
  ): Promise<Point[]> {
    try {
      const events = await this.contract.queryFilter(filter, from, to);

      devLog(
        `fetching data from ${this.abiName} ${this.eventQuery} ${this.contract.address} from ${from} to ${to}`
      );

      const points = (
        await Promise.all(
          events.map(
            async (event) =>
              await this.eventHandler({
                event,
                contract: this.contract,
                provider: this.contract
                  .provider as ethers.providers.JsonRpcProvider,
                chainName: this.chainName,
                abiName: this.abiName,
                eventQueryName: this.eventQuery,
                store,
              })
          )
        )
      ).flat();

      return points;
    } catch (e) {
      logError(e as Error, {
        abiName: this.abiName,
        eventQuery: this.eventQuery,
        contractAddress: this.contract.address,
        source: "ContractSource.fetchAndHandleEvents",
      });
      return [];
    }
  }

  public get chain(): string {
    return this.chainName;
  }
}
