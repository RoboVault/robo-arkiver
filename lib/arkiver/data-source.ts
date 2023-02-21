import { ethers, logger } from "@deps";
import { InfluxDBAdapter } from "../providers/influxdb.ts";
import { mockStatusProvider } from "../providers/mock.ts";
import { StatusProvider } from "../providers/types.ts";
import { EventHandler } from "@types";
import { delay, getEnv } from "@utils";

interface RawContracts {
  sources: {
    address: string;
    startBlockHeight: number;
  }[];
  eventQueries: {
    handler: string;
    name: string;
  }[];
  abiPath: string;
}

interface NormalizedContracts {
  contracts: {
    address: string;
    startBlockHeight: number;
  }[];
  topics: string[];
}
// TODO: add block handlers
export class DataSource {
  private readonly chain: string;
  private readonly rpcUrl: string;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly blockRange: number;
  private readonly arkiveId: number;
  private readonly arkiveVersion: number;
  private readonly statusProvider: StatusProvider;
  private readonly rawContracts: RawContracts[];
  private readonly abiStore: Map<
    string,
    ethers.InterfaceAbi
  > = new Map(); // abiPath to abi
  private readonly packagePath: string;
  private normalizedContracts: NormalizedContracts[] = [];
  private readonly handlers: Map<
    string,
    { handler: EventHandler; interface: ethers.Interface }
  > = new Map(); // topic to handler and interface
  private liveBlockHeight = 0;
  private processedBlockHeight = 0;
  private fetchedBlockHeight = 0;
  private readonly stagingQueue: Map<
    number,
    { logs: ethers.Log[]; nextFromBlock: number }
  > = new Map(); // from block to logs
  private eventLoops = {
    fetcher: true,
    processor: true,
  };
  private maxStageSize = 100;
  private liveDelay = 2000;
  private queueDelay = 500;
  private fetchInterval = 500;
  private maxStagingDelay = 1000;

  constructor(
    params: {
      contracts: RawContracts[];
      chain: string;
      rpcUrl: string;
      blockRange: number;
      packagePath: string;
      arkiveId: number;
      arkiveVersion: number;
    },
  ) {
    this.chain = params.chain;
    this.rpcUrl = params.rpcUrl;
    this.blockRange = params.blockRange;
    this.packagePath = params.packagePath;
    this.rawContracts = params.contracts;
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.arkiveId = params.arkiveId;
    this.arkiveVersion = params.arkiveVersion;
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

  public async run() {
    logger.info(`Running data source for ${this.chain}...`);
    await this.init();
    this.runFetcherLoop();
    this.runProcessorLoop();
  }

  private async init() {
    logger.info(`Initializing data source for ${this.chain}...`);
    await this.processRawContracts();
    await this.checkIndexedBlockHeights();
    await this.getLiveBlockHeight();
    this.fetchedBlockHeight = this.processedBlockHeight;
  }

  public stop() {
    this.eventLoops.fetcher = false;
    this.eventLoops.processor = false;
  }

  private async runFetcherLoop() {
    while (this.eventLoops.fetcher) {
      if (this.stagingQueue.size > this.maxStageSize) {
        logger.info(
          `Staging queue size is ${this.stagingQueue.size}, waiting...`,
        );
        await delay(this.maxStagingDelay);
        continue;
      }

      await this.getLiveBlockHeight();

      const fromBlock = this.fetchedBlockHeight;
      const toBlock = Math.min(
        fromBlock + this.blockRange,
        this.liveBlockHeight,
      );

      if (fromBlock > toBlock) {
        await delay(this.liveDelay);
        continue;
      }

      logger.info(`Fetching logs from block ${fromBlock} to ${toBlock}...`);

      const addresses = [];
      const topics = [];

      for (const normalizedContract of this.normalizedContracts) {
        const addressesToPush = normalizedContract.contracts.filter((c) =>
          c.startBlockHeight <= toBlock
        );
        if (addressesToPush.length === 0) {
          continue;
        }
        addresses.push(...addressesToPush.map((c) => c.address));
        topics.push(...normalizedContract.topics);
      }

      if (addresses.length === 0) {
        logger.error(`No addresses to fetch logs from!`);
        await delay(this.liveDelay);
        continue;
      }

      logger.info(`Fetching logs ${topics} from addresses: ${addresses}`);

      const nextFromBlock = toBlock + 1;

      this.provider.getLogs({
        fromBlock,
        toBlock,
        address: addresses,
        topics,
      }).then((logs) => {
        logger.info(
          `Fetched ${logs.length} logs from block ${fromBlock} to ${toBlock}...`,
        );
        this.stagingQueue.set(fromBlock, { logs, nextFromBlock });
      });

      this.fetchedBlockHeight = nextFromBlock;

      await delay(this.fetchInterval);
    }
  }

  private async runProcessorLoop() {
    const store: Record<string, unknown> = {};
    while (this.eventLoops.processor) {
      const logs = this.stagingQueue.get(this.processedBlockHeight);
      if (!logs) {
        logger.info(
          `No logs fetched yet to process for block ${this.processedBlockHeight}, waiting...`,
        );
        await delay(this.queueDelay);
        continue;
      }

      logger.info(`Processing logs from block ${this.processedBlockHeight}...`);

      for (
        const log of logs.logs.sort((a, b) => a.blockNumber - b.blockNumber)
      ) {
        const handler = this.handlers.get(log.topics[0]);
        if (!handler) {
          throw new Error("No handler set for topic " + log.topics[0]);
        }
        const fragment = handler.interface.getEvent(log.topics[0]);
        if (!fragment) {
          logger.error(`No fragment found for log ${log}`);
          continue;
        }
        const event = new ethers.EventLog(log, handler.interface, fragment);
        if (!event) {
          logger.error(`No event found for log ${log}`);
          continue;
        }
        await handler.handler({
          contract: new ethers.Contract(
            log.address,
            handler.interface.fragments,
            this.provider,
          ),
          event,
          eventName: fragment.name,
          provider: this.provider,
          store,
        });
      }

      this.stagingQueue.delete(this.processedBlockHeight);

      this.processedBlockHeight = logs.nextFromBlock;
    }
  }

  private async checkIndexedBlockHeights() {
    const indexedBlockHeight = await this.statusProvider
      .getIndexedBlockHeight({
        _chain: this.chain,
        _arkiveId: this.arkiveId.toString(),
        _arkiveVersion: this.arkiveVersion.toString(),
      });

    logger.info(
      `Indexed block height for ${this.chain}: ${indexedBlockHeight}...`,
    );

    if (indexedBlockHeight && indexedBlockHeight > this.processedBlockHeight) {
      this.processedBlockHeight = indexedBlockHeight;
    }
  }

  private async getLiveBlockHeight() {
    if (this.fetchedBlockHeight + this.blockRange < this.liveBlockHeight) {
      return;
    }
    logger.info(`Fetching live block height...`);
    const block = await this.provider.getBlockNumber();
    logger.info(`Live block height for ${this.chain}: ${block}...`);
    this.liveBlockHeight = block;
  }

  private async processRawContracts() {
    const res: NormalizedContracts[] = [];
    logger.info(
      `Processing raw contracts for ${this.chain}...`,
    );
    for (const rawContract of this.rawContracts) {
      const { abiPath, eventQueries, sources } = rawContract;

      const lowestBlockHeight = Math.min(
        ...sources.map((s) => s.startBlockHeight),
      );

      if (
        this.processedBlockHeight === 0 ||
        lowestBlockHeight < this.processedBlockHeight
      ) {
        this.processedBlockHeight = lowestBlockHeight;
      }

      const normalized: NormalizedContracts = {
        contracts: sources,
        topics: [],
      };

      const abi = await this.getAbi(abiPath);

      for (const eventQuery of eventQueries) {
        const { handler, name } = eventQuery;

        const iface = new ethers.Interface(abi);
        const event = iface.getEvent(name);
        if (event === null) {
          throw new Error(`Event ${name} not found in ${abiPath}`);
        }

        normalized.topics.push(event.topicHash);

        const handlerFn =
          (await import(`${this.packagePath}/${handler}`)).default;
        if (typeof handlerFn !== "function") {
          throw new Error(`Handler ${handler} is not a function`);
        }

        this.handlers.set(event.topicHash, {
          handler: handlerFn,
          interface: iface,
        });
      }

      res.push(normalized);
    }

    this.normalizedContracts = res;
  }

  private async getAbi(
    abiPath: string,
  ): Promise<ethers.InterfaceAbi> {
    if (this.abiStore.has(abiPath)) {
      return this.abiStore.get(abiPath)!;
    }
    const abi = (
      await import(`${this.packagePath}/${abiPath}`, {
        assert: { type: "json" },
      })
    ).default;

    this.abiStore.set(abiPath, abi);

    return abi;
  }
}
