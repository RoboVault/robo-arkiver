import { ethers, join, logger, QueryApi, WriteApi } from "@deps";
import { InfluxDBAdapter } from "../providers/influxdb.ts";
import { mockStatusProvider } from "../providers/mock.ts";
import { StatusProvider } from "../providers/types.ts";
import { BlockHandlerFn, EventHandler, IBlockHandler } from "@types";
import { delay, getEnv } from "@utils";
import { Store } from "./store.ts";

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

export class DataSource {
  private readonly chain: string;
  private readonly rpcUrl: string;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly blockRange: number;
  private readonly arkiveId: number;
  private readonly arkiveVersion: number;
  private readonly statusProvider: StatusProvider;
  private readonly rawContracts: RawContracts[];
  private readonly blockSources: IBlockHandler[];
  private readonly abiStore: Map<
    string,
    ethers.InterfaceAbi
  > = new Map(); // abiPath to abi
  private readonly packagePath: string;
  private normalizedContracts: NormalizedContracts[] = [];
  private readonly eventHandlers: Map<
    string,
    { handler: EventHandler; interface: ethers.Interface }
  > = new Map(); // topic to handler and interface
  private readonly addressToAbiPath: Map<
    string,
    string
  > = new Map(); // address to abiPath
  private readonly blockHandlers: Map<
    string,
    BlockHandlerFn
  > = new Map(); // block handler  to block handler
  private liveBlockHeight = 0;
  private processedBlockHeight = 0;
  private fetchedBlockHeight = 0;
  private readonly stagingLogsQueue: Map<
    number,
    { logs: ethers.Log[]; nextFromBlock: number }
  > = new Map(); // from block to logs
  private readonly stagingBlocksQueue: Map<
    number,
    {
      blocks: {
        block: ethers.Block;
        handlers: string[];
      }[];
      nextFromBlock: number;
    }
  > = new Map(); // from block to blocks
  private readonly stagingQueuePending: {
    logs: Map<number, boolean>;
    blocks: Map<number, boolean>;
  } = {
    logs: new Map(),
    blocks: new Map(),
  }; // track if some logs or blocks are pending to be processed
  private readonly retryBlocks: Map<number, number> = new Map(); // blocks to retry
  private eventLoops = {
    fetcher: true,
    processor: true,
  };
  private maxStageSize = 10;
  private liveDelay = 2000;
  private queueDelay = 500;
  private fetchInterval = 500;
  private maxStagingDelay = 1000;
  private db: {
    writer: WriteApi;
    reader: QueryApi;
  };
  private readonly store = new Store();
  private isLive = false;

  constructor(
    params: {
      contracts: RawContracts[];
      chain: string;
      rpcUrl: string;
      blockRange: number;
      packagePath: string;
      arkiveId: number;
      arkiveVersion: number;
      blockSources: IBlockHandler[];
      db: {
        writer: WriteApi;
        reader: QueryApi;
      };
    },
  ) {
    this.chain = params.chain;
    this.rpcUrl = params.rpcUrl;
    this.blockRange = params.blockRange;
    this.packagePath = params.packagePath;
    this.rawContracts = params.contracts;
    this.blockSources = params.blockSources;
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.arkiveId = params.arkiveId;
    this.arkiveVersion = params.arkiveVersion;
    this.db = {
      writer: params.db.writer.useDefaultTags({
        chain: this.chain,
        arkiveId: this.arkiveId.toString(),
        arkiveVersion: this.arkiveVersion.toString(),
      }),
      reader: params.db.reader,
    };
    if (getEnv("DENO_ENV") === "PROD") {
      logger.info("Using InfluxDB status provider...");
      this.statusProvider = new InfluxDBAdapter({
        url: getEnv("INFLUXDB_URL"),
        token: getEnv("INFLUXDB_TOKEN"),
        bucket: getEnv("INFLUXDB_BUCKET"),
        org: getEnv("INFLUXDB_ORG"),
      });
    } else {
      logger.info("Using mock status provider...");
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
    await this.getLiveBlockHeight();
    await this.processRawContracts();
    await this.loadBlockHandlers();
    await this.checkIndexedBlockHeights();
    this.fetchedBlockHeight = this.processedBlockHeight;
  }

  public stop() {
    this.eventLoops.fetcher = false;
    this.eventLoops.processor = false;
  }

  private async runFetcherLoop() {
    while (this.eventLoops.fetcher) {
      for (const [retryFrom, retryTo] of this.retryBlocks) {
        this.fetchLogs(retryFrom, retryTo);
        this.fetchBlocks(retryFrom, retryTo);
      }

      if (
        this.stagingLogsQueue.size > this.maxStageSize ||
        this.stagingBlocksQueue.size > this.maxStageSize
      ) {
        logger.info(
          `Staging queue size is logs - ${this.stagingLogsQueue.size}, blocks - ${this.stagingBlocksQueue.size}, waiting...`,
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

      if (toBlock === this.liveBlockHeight && !this.isLive) this.isLive = true;

      if (fromBlock > toBlock) {
        await delay(this.liveDelay);
        continue;
      }

      this.fetchLogs(fromBlock, toBlock);
      this.fetchBlocks(fromBlock, toBlock);

      this.fetchedBlockHeight = toBlock + 1;

      await delay(this.fetchInterval);
    }
  }

  private fetchLogs(fromBlock: number, toBlock: number) {
    if (this.rawContracts.length === 0) {
      this.stagingQueuePending.logs.set(fromBlock, false);
      return;
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
      this.stagingQueuePending.logs.set(fromBlock, false);
      return;
    }

    const nextFromBlock = toBlock + 1;

    this.provider.getLogs({
      fromBlock,
      toBlock,
      address: addresses,
      topics: [topics],
    }).then((logs) => {
      logger.info(
        `Fetched ${logs.length} logs from block ${fromBlock} to ${toBlock}...`,
      );
      this.stagingLogsQueue.set(fromBlock, { logs, nextFromBlock });
      this.retryBlocks.delete(fromBlock);
    }).catch((e) => {
      logger.error(
        `Error fetching logs from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}, retrying...`,
      );
      this.retryBlocks.set(fromBlock, toBlock);
    });

    this.stagingQueuePending.logs.set(fromBlock, true);
  }

  private fetchBlocks(fromBlock: number, toBlock: number) {
    if (this.blockSources.length === 0) {
      this.stagingQueuePending.blocks.set(fromBlock, false);
      return;
    }
    logger.info(`Fetching blocks from block ${fromBlock} to ${toBlock}...`);
    const blockToHandlers = new Map<number, string[]>();
    const blockSources = this.blockSources.filter((source) =>
      source.startBlockHeight <= toBlock ||
      (source.startBlockHeight === "live" && this.isLive)
    );
    if (blockSources.length === 0) {
      this.stagingQueuePending.blocks.set(fromBlock, false);
      return;
    }
    for (const blockSource of blockSources) {
      if (blockSource.startBlockHeight === "live") {
        blockSource.startBlockHeight = this.liveBlockHeight;
      }

      const newFromBlock = Math.max(
        blockSource.startBlockHeight,
        fromBlock,
      );
      const blocks = Array.from(
        {
          length: Math.ceil(
            (toBlock - newFromBlock + 1) /
              blockSource.blockInterval,
          ),
        },
        (_, i) => i * blockSource.blockInterval + newFromBlock,
      );
      blocks.forEach((block) => {
        const handlers = blockToHandlers.get(block) || [];
        blockToHandlers.set(block, [...handlers, blockSource.handlerPath]);
      });
      blockSource.startBlockHeight = blocks[blocks.length - 1] +
        blockSource.blockInterval;
    }

    const nextFromBlock = toBlock + 1;

    const blocksPromises = Array.from(blockToHandlers.entries()).map(
      async ([block, handlers]) => {
        const blockData = await this.provider.getBlock(block, true);
        if (!blockData) {
          logger.error(`Block ${block} not found!`);
          return;
        }
        return {
          block: await this.provider.getBlock(block, true),
          handlers,
        };
      },
    );

    Promise.all(blocksPromises).then((blocks) => {
      blocks = blocks.filter((b) => b !== undefined && b.block !== null);
      logger.info(
        `Fetched ${blocks.length} blocks from block ${fromBlock} to ${toBlock}...`,
      );
      this.stagingBlocksQueue.set(
        fromBlock,
        {
          blocks: blocks as { block: ethers.Block; handlers: string[] }[],
          nextFromBlock,
        },
      );
      this.retryBlocks.delete(fromBlock);
    }).catch((e) => {
      logger.error(
        `Error fetching blocks from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}, retrying...`,
      );
      this.retryBlocks.set(fromBlock, toBlock);
    });

    this.stagingQueuePending.blocks.set(fromBlock, true);
  }

  private async runProcessorLoop() {
    const tempStore = new Store();
    while (this.eventLoops.processor) {
      const logs = this.stagingLogsQueue.get(this.processedBlockHeight);
      const logsPending = this.stagingQueuePending.logs.get(
        this.processedBlockHeight,
      );
      const blocks = this.stagingBlocksQueue.get(this.processedBlockHeight);
      const blocksPending = this.stagingQueuePending.blocks.get(
        this.processedBlockHeight,
      );

      if (!logsPending && !blocksPending) {
        await delay(this.queueDelay);
        continue;
      }

      if (
        (!logs && logsPending) || (!blocks && blocksPending)
      ) {
        logger.info(
          `No logs or blocks fetched yet to process for block ${this.processedBlockHeight}, waiting...`,
        );
        await delay(this.queueDelay);
        continue;
      }

      logger.info(
        `Processing logs and blocks from block ${this.processedBlockHeight}...`,
      );

      const logsAndBlocks = [
        ...logs?.logs ?? [],
        ...blocks?.blocks.map((b) => ({
          ...b,
          blockNumber: b.block.number,
          isBlock: true,
        })) ?? [],
      ];
      logsAndBlocks.sort((a, b) => a.blockNumber - b.blockNumber);

      for (
        const logOrBlock of logsAndBlocks
      ) {
        if (!(logOrBlock as { isBlock: boolean | undefined }).isBlock) {
          const log = logOrBlock as ethers.Log;
          const abiPath = this.addressToAbiPath.get(log.address);
          if (!abiPath) {
            logger.error(`No ABI found for log ${log}`);
            continue;
          }
          const handler = this.eventHandlers.get(`${log.topics[0]}-${abiPath}`);
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
          try {
            await handler.handler({
              contract: new ethers.Contract(
                log.address,
                handler.interface.fragments,
                this.provider,
              ),
              event,
              eventName: fragment.name,
              provider: this.provider,
              store: this.store,
              db: this.db,
              tempStore,
            });
          } catch (_e) {
            handler.handler({
              contract: new ethers.Contract(
                log.address,
                handler.interface.fragments,
                this.provider,
              ),
              event,
              eventName: fragment.name,
              provider: this.provider,
              store: this.store,
              db: this.db,
              tempStore,
            }).catch((e) => {
              logger.error(`Error running event handler ${event}: ${e}`);
            });
          }
        } else {
          const block = logOrBlock as {
            block: ethers.Block;
            handlers: string[];
          };

          for (const handlerPath of block.handlers) {
            const handler = this.blockHandlers.get(handlerPath)!;
            try {
              await handler({
                block: block.block,
                provider: this.provider,
                store: this.store,
                db: this.db,
                tempStore,
              });
            } catch (_e) {
              handler({
                block: block.block,
                provider: this.provider,
                store: this.store,
                db: this.db,
                tempStore,
              }).catch((e) => {
                logger.error(
                  `Error running block handler ${handlerPath}: ${e}`,
                );
              });
            }
          }
        }
      }

      this.stagingLogsQueue.delete(this.processedBlockHeight);
      this.stagingBlocksQueue.delete(this.processedBlockHeight);
      this.stagingQueuePending.logs.delete(this.processedBlockHeight);
      this.stagingQueuePending.blocks.delete(this.processedBlockHeight);
      tempStore.clear();
      logger.info(`Processed block ${this.processedBlockHeight}...`);

      this.processedBlockHeight = logs?.nextFromBlock ??
        blocks!.nextFromBlock;
    }
  }

  private async checkIndexedBlockHeights() {
    const indexedBlockHeight = await this.statusProvider
      .getIndexedBlockHeight({
        chain: this.chain,
        arkiveId: this.arkiveId.toString(),
        arkiveVersion: this.arkiveVersion.toString(),
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

  private async loadBlockHandlers() {
    if (this.blockSources.length === 0) return;
    logger.info(`Loading block handlers for ${this.chain}...`);
    for (const blockSource of this.blockSources) {
      const { handlerPath } = blockSource;
      const handlerFn = await import(join(this.packagePath, handlerPath));
      this.blockHandlers.set(handlerPath, handlerFn.default);

      if (blockSource.startBlockHeight === "live") {
        if (this.processedBlockHeight === 0) {
          this.processedBlockHeight = this.liveBlockHeight;
        }
        continue;
      }

      if (
        this.processedBlockHeight === 0 ||
        blockSource.startBlockHeight < this.processedBlockHeight
      ) {
        this.processedBlockHeight = blockSource.startBlockHeight;
      }
    }
  }

  private async processRawContracts() {
    const res: NormalizedContracts[] = [];
    logger.info(
      `Processing raw contracts for ${this.chain}...`,
    );
    for (const rawContract of this.rawContracts) {
      const { abiPath, eventQueries, sources } = rawContract;

      const lowestBlockHeight = Math.min(
        ...sources.map((s) => {
          this.addressToAbiPath.set(s.address, abiPath); // hackerzzz
          return s.startBlockHeight;
        }),
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

        const path = join(this.packagePath, handler);
        logger.info(`Loading handler ${path}...`);
        const handlerFn = (await import(path)).default;
        if (typeof handlerFn !== "function") {
          throw new Error(`Handler ${handler} is not a function`);
        }

        this.eventHandlers.set(
          `${event.topicHash}-${abiPath}`,
          {
            handler: handlerFn,
            interface: iface,
          },
        );
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
      await import(join(this.packagePath, abiPath), {
        assert: { type: "json" },
      })
    ).default;

    this.abiStore.set(abiPath, abi);

    return abi;
  }
}
