import { ethers, Point } from "@deps";
import { devLog, getEnv, logError, timeout } from "@utils";
import { Arkive, EventHandler, Filter } from "@types";
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
  private readonly arkive: Arkive;
  private readonly filter?: Filter;

  constructor(params: {
    abiName: string;
    chainName: string;
    startBlockHeight: number;
    eventQuery: string;
    filter?: Filter;
    contract: ethers.Contract;
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
    this.blockRange = params.blockRange;
    this.eventHandler = params.eventHandler;
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
      type: "eventHandler",
      _abi: this.abiName,
      _address: this.contract.address,
      _event: this.eventQuery,
      _chain: this.chainName,
      _arkiveId: this.arkive.id.toString(),
      _arkiveVersion: this.arkive.deployment.major_version.toString(),
    });

    devLog(
      "indexedBlockHeight",
      indexedBlockHeight,
      this.contract.address,
      this.eventQuery,
    );

    if (indexedBlockHeight && indexedBlockHeight > this.startBlockHeight) {
      this.startBlockHeight = indexedBlockHeight;
    }
  }

  public getDataPoints(
    currentBlockHeight: number,
    store: Record<string, unknown>,
    callback: (points: Point[]) => void,
  ): void {
    const filterFn = this.contract.filters[this.eventQuery];
    if (!filterFn) {
      throw new Error(`Event query ${this.eventQuery} not found`);
    }
    const filter = filterFn(this.filter);

    const from = Math.min(this.startBlockHeight + 1, currentBlockHeight);
    const to = Math.min(
      currentBlockHeight,
      this.startBlockHeight + this.blockRange,
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
    store: Record<string, unknown>,
  ): Promise<Point[]> {
    try {
      const events = await this.contract.queryFilter(filter, from, to);

      devLog(
        `fetching data from ${this.abiName} ${this.eventQuery} ${this.contract.address} from ${from} to ${to}`,
      );

      const points = (
        await Promise.all(
          events.map(async (event) => {
            const timestampMs = (await event.getBlock()).timestamp * 1000;
            const pointsPromise = this.eventHandler({
              event,
              contract: this.contract,
              provider: this.contract
                .provider as ethers.providers.JsonRpcProvider,
              chainName: this.chainName,
              abiName: this.abiName,
              eventQueryName: this.eventQuery,
              store,
              timestampMs,
            });
            const points = await Promise.race([pointsPromise, timeout(10000)]);
            return points.map((point) => {
              return point
                .tag("_chain", this.chainName)
                .tag("_address", this.contract.address)
                .tag("_event", this.eventQuery)
                .tag("_abi", this.abiName)
                .tag(
                  "_arkiveVersion",
                  this.arkive.deployment.major_version.toString(),
                )
                .tag("_arkiveId", this.arkive.id.toString())
                .stringField("_txHash", event.transactionHash)
                .intField("_blockHeight", event.blockNumber)
                .intField("_logIndex", event.logIndex)
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
