// deno-lint-ignore-file no-explicit-any
import {
  Abi,
  createPublicClient,
  decodeEventLog,
  encodeEventTopics,
  getContract,
  http,
  HttpTransport,
  PublicClient,
} from '../deps.ts'
import { logger } from '../logger.ts'
import { StatusProvider } from './providers/interfaces.ts'
import {
  BlockHandler,
  Chains,
  Contract,
  EventHandler,
  IBlockHandler,
  SafeBlock,
  SafeRpcLog,
} from './types.ts'
import {
  bigIntMax,
  bigIntMin,
  delay,
  formatLog,
  getBlocksPerSecond,
  getChainObjFromChainName,
} from '../utils.ts'
import { Store } from './store.ts'
import { MongoStatusProvider } from './providers/mongodb.ts'

interface NormalizedContracts {
  contracts: {
    address: string
    startBlockHeight: bigint
  }[]
  signatureTopics: string[]
}

export class DataSource extends EventTarget {
  private readonly chain: Chains
  private readonly rpcUrl: string
  private readonly client: PublicClient<HttpTransport>
  private readonly blockRange: bigint
  private readonly arkiveId: number
  private readonly arkiveVersion: number
  private readonly arkiveMinorVersion: number
  private readonly statusProvider: StatusProvider
  private readonly contracts: Contract[]
  private readonly blockSources: IBlockHandler[]
  private normalizedContracts: NormalizedContracts = {
    contracts: [],
    signatureTopics: [],
  }
  private readonly agnosticEvents: Map<
    `0x${string}`,
    {
      handler: EventHandler<any, any, Abi>
      abi: Abi
      startBlockHeight: bigint
      contractId: string
    }
  > = new Map() // topic to handler and interface
  private readonly eventHandlers: Map<
    string,
    { handler: EventHandler<any, any, Abi>; abi: Abi }
  > = new Map() // topic to handler and interface
  private readonly addressToId: Map<
    string,
    string
  > = new Map() // address to uuid
  private liveBlockHeight = 0n
  private processedBlockHeight = 0n
  private fetchedBlockHeight = 0n
  private readonly logsQueue: Map<
    bigint,
    { logs: SafeRpcLog[]; nextFromBlock: bigint }
  > = new Map() // from block to logs
  private readonly agnosticLogsQueue: Map<
    bigint,
    { logs: SafeRpcLog[]; nextFromBlock: bigint }
  > = new Map() // from block to logs
  private readonly blocksQueue: Map<
    bigint,
    {
      blocks: {
        block: SafeBlock
        handlers: BlockHandler[]
      }[]
      nextFromBlock: bigint
    }
  > = new Map() // from block to blocks
  private readonly retryFetchBlocks: Map<bigint, bigint> = new Map() // blocks to retry
  private readonly retryFetchLogs: Map<bigint, bigint> = new Map() // blocks to retry
  private readonly retryFetchAgnosticLogs: Map<bigint, bigint> = new Map() // blocks to retry
  private eventLoops = {
    fetcher: true,
    processor: true,
  }
  private maxQueueSize = 3
  private liveDelay = 2000
  private queueDelay = 500
  private fetchInterval = 500
  private queueFullDelay = 1000
  private readonly store = new Store({
    max: 1000,
  })
  private isLive = false
  private noDb: boolean
  private maxHandlerRetries = 5
  private factorySources: Map<string, { // topic to event parameter, abi, child topics and child contract name
    eventParameter: string
    abi: Abi
    childTopics: string[]
    childContractName: string
  }> = new Map()

  constructor(
    params: {
      contracts: Contract[]
      chain: Chains
      rpcUrl: string
      blockRange: bigint
      arkiveId: number
      arkiveVersion: number
      arkiveMinorVersion: number
      blockSources: IBlockHandler[]
      noDb: boolean
    },
  ) {
    super()
    this.chain = params.chain
    this.rpcUrl = params.rpcUrl
    this.blockRange = params.blockRange
    this.contracts = params.contracts
    this.blockSources = params.blockSources
    this.client = createPublicClient({
      chain: getChainObjFromChainName(this.chain) as any,
      transport: http(this.rpcUrl),
    })
    this.arkiveId = params.arkiveId
    this.arkiveVersion = params.arkiveVersion
    this.arkiveMinorVersion = params.arkiveMinorVersion
    this.statusProvider = new MongoStatusProvider()
    this.noDb = params.noDb
  }

  public async run() {
    await this.init()
    this.runFetcherLoop()
    this.runProcessorLoop()
  }

  private async init() {
    logger(this.chain).debug(`Initializing data source`)
    await this.getLiveBlockHeight()
    this.loadContracts()
    this.loadBlockHandlers()
    await this.checkIndexedBlockHeights()
    this.finalChecks()
    this.fetchedBlockHeight = this.processedBlockHeight
  }

  public stop() {
    this.eventLoops.fetcher = false
    this.eventLoops.processor = false
  }

  private async runFetcherLoop() {
    while (this.eventLoops.fetcher) {
      for (const [retryFrom, retryTo] of this.retryFetchBlocks) {
        const nextFromBlock = retryTo + 1n
        this.fetchBlocks(retryFrom, retryTo, nextFromBlock)

        this.retryFetchBlocks.delete(retryFrom)
      }

      for (const [retryFrom, retryTo] of this.retryFetchLogs) {
        const nextFromBlock = retryTo + 1n
        this.fetchLogs(retryFrom, retryTo, nextFromBlock)

        this.retryFetchLogs.delete(retryFrom)
      }

      for (const [retryFrom, retryTo] of this.retryFetchAgnosticLogs) {
        const nextFromBlock = retryTo + 1n
        this.fetchAgnosticLogs(retryFrom, retryTo, nextFromBlock)

        this.retryFetchAgnosticLogs.delete(retryFrom)
      }

      if (
        this.logsQueue.size > this.maxQueueSize ||
        this.blocksQueue.size > this.maxQueueSize ||
        this.agnosticLogsQueue.size > this.maxQueueSize
      ) {
        logger(this.chain).debug(
          `Queue size is logs - ${
            this.logsQueue.size + this.agnosticLogsQueue.size
          }, blocks - ${this.blocksQueue.size}, waiting...`,
        )
        await delay(this.queueFullDelay)
        continue
      }

      await this.getLiveBlockHeight()

      const fromBlock = this.fetchedBlockHeight
      const toBlock = bigIntMin(
        fromBlock + this.blockRange,
        this.liveBlockHeight,
      )

      if (toBlock === this.liveBlockHeight && !this.isLive) {
        this.isLive = true
        this.dispatchEvent(new Event('synced'))
        logger(this.chain).info(
          `Start live arkiving for ${this.chain} at ${this.liveBlockHeight}`,
        )
      }

      if (fromBlock > toBlock) {
        await delay(this.liveDelay)
        continue
      }

      const nextFromBlock = toBlock + 1n

      this.fetchLogs(fromBlock, toBlock, nextFromBlock)
      this.fetchAgnosticLogs(fromBlock, toBlock, nextFromBlock)
      this.fetchBlocks(fromBlock, toBlock, nextFromBlock)

      this.fetchedBlockHeight = toBlock + 1n

      await delay(this.fetchInterval)
    }
  }

  private fetchLogs(fromBlock: bigint, toBlock: bigint, nextFromBlock: bigint) {
    if (this.normalizedContracts.contracts.length === 0) {
      this.logsQueue.set(fromBlock, {
        logs: [],
        nextFromBlock,
      })
      return
    }

    logger(this.chain).debug(
      `Fetching logs from block ${fromBlock} to ${toBlock}...`,
    )

    const addresses = this.normalizedContracts.contracts.filter((c) =>
      c.startBlockHeight <= toBlock
    ).map((c) => c.address)

    if (addresses.length === 0) {
      this.logsQueue.set(fromBlock, {
        logs: [],
        nextFromBlock,
      })
      return
    }

    this.client.request({
      method: 'eth_getLogs',
      params: [
        {
          address: addresses as `0x${string}`[],
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          topics: [
            this.normalizedContracts.signatureTopics,
          ] as `0x${string}`[][],
        },
      ],
    }).then(async (logs) => {
      if (
        logs.some((l) => {
          return l.blockHash === null ||
            l.blockNumber === null ||
            l.transactionHash === null ||
            l.transactionIndex === null ||
            l.logIndex === null
        })
      ) {
        logger(this.chain).debug(`Some logs still pending, retrying...`)
        this.retryFetchLogs.set(fromBlock, toBlock)
        return
      }
      const childLogs = await this.runFactories({
        logs: logs as SafeRpcLog[],
        fromBlock,
        toBlock,
      })
      const joinedLogs = childLogs.concat(logs as SafeRpcLog[])
      logger(this.chain).debug(
        `Fetched ${joinedLogs.length} logs from block ${fromBlock} to ${toBlock}...`,
      )
      this.logsQueue.set(fromBlock, {
        logs: joinedLogs as SafeRpcLog[],
        nextFromBlock,
      })
      this.retryFetchLogs.delete(fromBlock)
    }).catch((e) => {
      logger(this.chain).error(
        `Error fetching logs from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}\n${e.stack}, retrying...`,
      )
      this.retryFetchLogs.set(fromBlock, toBlock)
    })
  }

  private fetchAgnosticLogs(
    fromBlock: bigint,
    toBlock: bigint,
    nextFromBlock: bigint,
  ) {
    if (this.agnosticEvents.size === 0) {
      this.agnosticLogsQueue.set(fromBlock, {
        logs: [],
        nextFromBlock,
      })
      return
    }

    logger(this.chain).debug(
      `Fetching agnostic logs from block ${fromBlock} to ${toBlock}...`,
    )

    const topics = Array.from(this.agnosticEvents.entries()).filter(
      ([_, { startBlockHeight }]) => startBlockHeight <= toBlock,
    ).map(([topic]) => topic)

    if (topics.length === 0) {
      this.agnosticLogsQueue.set(fromBlock, {
        logs: [],
        nextFromBlock,
      })
      return
    }

    this.client.request({
      method: 'eth_getLogs',
      params: [
        {
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          topics: [topics],
        },
      ],
    }).then(async (logs) => {
      if (
        logs.some((l) => {
          return l.blockHash === null ||
            l.blockNumber === null ||
            l.transactionHash === null ||
            l.transactionIndex === null ||
            l.logIndex === null
        })
      ) {
        logger(this.chain).debug(`Some logs still pending, retrying...`)
        this.retryFetchAgnosticLogs.set(fromBlock, toBlock)
        return
      }
      const childLogs = await this.runFactories({
        logs: logs as SafeRpcLog[],
        fromBlock,
        toBlock,
      })
      const joinedLogs = childLogs.concat(logs as SafeRpcLog[])
      logger(this.chain).debug(
        `Fetched ${joinedLogs.length} agnostic logs from block ${fromBlock} to ${toBlock}...`,
      )
      this.agnosticLogsQueue.set(fromBlock, {
        logs: joinedLogs as SafeRpcLog[],
        nextFromBlock,
      })
      this.retryFetchAgnosticLogs.delete(fromBlock)
    }).catch((e) => {
      logger(this.chain).error(
        `Error fetching agnostic logs from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}, retrying...`,
      )
      this.retryFetchAgnosticLogs.set(fromBlock, toBlock)
    })
  }

  private fetchBlocks(
    fromBlock: bigint,
    toBlock: bigint,
    nextFromBlock: bigint,
  ) {
    if (this.blockSources.length === 0) {
      this.blocksQueue.set(
        fromBlock,
        {
          blocks: [],
          nextFromBlock,
        },
      )
      return
    }
    logger(this.chain).debug(
      `Fetching blocks from block ${fromBlock} to ${toBlock}...`,
    )
    const blockToHandlers = new Map<bigint, BlockHandler[]>()
    const blockSources = this.blockSources.filter((source) =>
      source.startBlockHeight !== 'live' &&
        source.startBlockHeight <= toBlock &&
        source.startBlockHeight >= fromBlock ||
      (source.startBlockHeight === 'live' && this.isLive)
    )
    if (blockSources.length === 0) {
      this.blocksQueue.set(
        fromBlock,
        {
          blocks: [],
          nextFromBlock,
        },
      )
      return
    }
    for (const blockSource of blockSources) {
      if (blockSource.startBlockHeight === 'live') {
        blockSource.startBlockHeight = this.liveBlockHeight
      }

      const newFromBlock = bigIntMax(
        blockSource.startBlockHeight,
        fromBlock,
      )

      const arrayLengthRemainder = (toBlock - newFromBlock + 1n) %
        blockSource.blockInterval
      const arrayLength = Number(
        (toBlock - newFromBlock + 1n) /
            blockSource.blockInterval + (arrayLengthRemainder ===
              0n
            ? 0n
            : 1n),
      )

      const blocks = Array.from(
        {
          length: arrayLength,
        },
        (_, i) => BigInt(i) * blockSource.blockInterval + newFromBlock,
      )
      blocks.forEach((block) => {
        const handlers = blockToHandlers.get(block) || []
        blockToHandlers.set(block, [...handlers, blockSource.handler])
      })
      blockSource.startBlockHeight = blocks[blocks.length - 1] +
        blockSource.blockInterval
    }

    const blocksPromises = Array.from(blockToHandlers.entries()).map(
      async ([block, handlers]) => {
        return {
          block: await this.client.getBlock({
            blockNumber: block,
            includeTransactions: true,
          }),
          handlers,
        }
      },
    )

    Promise.all(blocksPromises).then((blocks) => {
      if (blocks.some((b) => b.block.number === null)) {
        logger(this.chain).debug(`Some blocks still pending, retrying...`)
        this.retryFetchBlocks.set(fromBlock, toBlock)
        return
      }
      logger(this.chain).debug(
        `Fetched ${blocks.length} blocks from block ${fromBlock} to ${toBlock}...`,
      )
      this.blocksQueue.set(
        fromBlock,
        {
          blocks: blocks as { block: SafeBlock; handlers: BlockHandler[] }[],
          nextFromBlock,
        },
      )
      this.retryFetchBlocks.delete(fromBlock)
    }).catch((e) => {
      logger(this.chain).error(
        `Error fetching blocks from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}, retrying...`,
      )
      this.retryFetchBlocks.set(fromBlock, toBlock)
    })
  }

  private async runProcessorLoop() {
    while (this.eventLoops.processor) {
      const logs = this.logsQueue.get(this.processedBlockHeight)
      const blocks = this.blocksQueue.get(this.processedBlockHeight)
      const agnosticLogs = this.agnosticLogsQueue.get(
        this.processedBlockHeight,
      )

      if (
        logs === undefined || blocks === undefined || agnosticLogs === undefined
      ) {
        logger(this.chain).debug(
          `Waiting for fetcher loop to finish ${this.processedBlockHeight}...`,
        )
        await delay(this.queueDelay)
        continue
      }

      logger(this.chain).debug(
        `Processing logs and blocks from block ${this.processedBlockHeight}...`,
      )

      const logsAndBlocks: (
        | ({
          blockNumber: `0x${string}`
          type: 'log' | 'agnosticLog'
        } & SafeRpcLog)
        | {
          blockNumber: bigint
          type: 'block'
          block: SafeBlock
          handlers: BlockHandler[]
        }
      )[] = [
        ...logs.logs.map((log) => ({
          ...log,
          blockNumber: log.blockNumber,
          type: 'log' as const,
        })),
        ...blocks.blocks.map((block) => ({
          ...block,
          blockNumber: block.block.number,
          type: 'block' as const,
        })),
        ...agnosticLogs.logs.map((log) => ({
          ...log,
          blockNumber: log.blockNumber,
          type: 'agnosticLog' as const,
        })),
      ]

      const nextFromBlock = logs.nextFromBlock ??
        agnosticLogs.nextFromBlock ??
        blocks.nextFromBlock

      if (logsAndBlocks.length === 0) {
        this.logsQueue.delete(this.processedBlockHeight)
        this.blocksQueue.delete(this.processedBlockHeight)
        this.agnosticLogsQueue.delete(this.processedBlockHeight)

        this.processedBlockHeight = nextFromBlock

        logger(this.chain).debug(
          `No logs or blocks found for block ${this.processedBlockHeight}, skipping...`,
        )
        continue
      }

      logsAndBlocks.sort((a, b) => {
        a.blockNumber = !(typeof a.blockNumber === 'bigint')
          ? BigInt(a.blockNumber)
          : a.blockNumber
        b.blockNumber = !(typeof b.blockNumber === 'bigint')
          ? BigInt(b.blockNumber)
          : b.blockNumber
        if (
          (a.type === 'log' || a.type === 'agnosticLog') &&
          (b.type === 'log' || b.type === 'agnosticLog')
        ) {
          const isEqual = a.blockNumber === b.blockNumber
          if (isEqual) {
            return parseInt(a.logIndex, 16) - parseInt(b.logIndex, 16)
          }
        }
        return Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n))
      })

      let error: string | undefined

      const startTime = performance.now()

      logger(this.chain).info(
        `Running handlers for blocks ${this.processedBlockHeight}-${
          nextFromBlock ?? 'unknown'
        } (${this.blockRange} blocks - ${logsAndBlocks.length} items)`,
      )

      for (
        const logOrBlock of logsAndBlocks
      ) {
        if (logOrBlock.type === 'log') {
          const log = logOrBlock as SafeRpcLog

          const contractId = this.addressToId.get(log.address.toLowerCase())
          if (!contractId) {
            logger(this.chain).error(`No contract ID found for log ${log}`)
            continue
          }
          const handler = this.eventHandlers.get(
            `${log.topics[0]}-${contractId}`,
          )

          if (!handler) {
            if (this.factorySources.get(log.topics[0] ?? 'anon')) continue
            logger(this.chain).warning(
              `No event handler set for ${log.topics[0]}-${contractId}`,
            )
            continue
          }

          const event = decodeEventLog({
            abi: handler.abi,
            data: log.data,
            topics: [log.topics[0]!, ...log.topics.slice(1)],
          })

          const loggerKey = `${this.chain}-${contractId}-${event.eventName}`

          let retries = 0
          while (true) {
            try {
              await handler.handler({
                eventName: event.eventName,
                client: this.client,
                store: this.store,
                event: formatLog(log, event as any),
                contract: getContract({
                  abi: handler.abi,
                  address: log.address,
                  publicClient: this.client,
                }),
                logger: logger(loggerKey),
              })
              break
            } catch (e) {
              error =
                `Event handler ${handler.handler.name} at block ${log.blockNumber} with arguments:${
                  Object.entries(event.args ?? {}).map(([name, arg], idx) =>
                    `\n    ${idx} ${name}: ${arg}`
                  )
                }\n${e.stack}`
              logger(loggerKey).error(error)
              retries++
              if (retries > this.maxHandlerRetries) {
                this.dispatchEvent(new Event('handlerError'))
                logger(loggerKey).debug(
                  `Max retries reached for handler ${handler.handler.name} at block ${log.blockNumber}, stopping ...`,
                )
                this.stop()
                return
              }
            }
          }
        } else if (logOrBlock.type === 'block') {
          for (const handler of logOrBlock.handlers) {
            const loggerKey = `${this.chain}-${handler.name}`

            let retries = 0
            while (true) {
              try {
                await handler({
                  block: logOrBlock.block,
                  client: this.client,
                  store: this.store,
                  logger: logger(loggerKey),
                })
                break
              } catch (e) {
                error =
                  `Block handler ${handler.name} at block ${logOrBlock.block.number}\n${e.stack}`
                logger(loggerKey).error(error)
                retries++
                if (retries > this.maxHandlerRetries) {
                  this.dispatchEvent(new Event('handlerError'))
                  logger(loggerKey).debug(
                    `Max retries reached for handler ${handler.name} at block ${logOrBlock.block.number}, stopping ...`,
                  )
                  this.stop()
                  return
                }
              }
            }
          }
        } else if (logOrBlock.type === 'agnosticLog') {
          const log = logOrBlock as SafeRpcLog

          const topic = log.topics[0]

          if (!topic) {
            logger(this.chain).error(`No topic found for log ${log}`)
            continue
          }

          const eventHandler = this.agnosticEvents.get(topic)
          if (!eventHandler) {
            logger(this.chain).error(
              `No event handler found for agnostic log ${log}`,
            )
            continue
          }

          const decode = () => {
            try {
              return decodeEventLog({
                abi: eventHandler.abi,
                data: log.data,
                topics: [log.topics[0]!, ...log.topics.slice(1)],
              })
            } catch (e) {
              logger(this.chain).warning(
                `Failed to decode event log ${log}. Likely a signature miss-match\n${e}`,
              )
              return
            }
          }

          const event = decode()
          if (!event) {
            continue
          }

          const loggerKey =
            `${this.chain}-${eventHandler.contractId}-${event.eventName}`

          let retries = 0
          while (true) {
            try {
              await eventHandler.handler({
                eventName: event.eventName,
                client: this.client,
                store: this.store,
                event: formatLog(log, event as any),
                contract: getContract({
                  abi: eventHandler.abi,
                  address: log.address,
                  publicClient: this.client,
                }),
                logger: logger(loggerKey),
              })
              break
            } catch (e) {
              error =
                `Agnostic event handler ${eventHandler.handler.name} at block ${log.blockNumber} with arguments:${
                  Object.entries(event.args ?? {}).map(([name, arg], idx) =>
                    `\n    ${idx} ${name}: ${arg}`
                  )
                }\n${e.stack}`
              logger(loggerKey).error(error)
              retries++
              if (retries > this.maxHandlerRetries) {
                this.dispatchEvent(new Event('handlerError'))
                logger(loggerKey).debug(
                  `Max retries reached for handler ${eventHandler.handler.name} at block ${log.blockNumber}, stopping ...`,
                )
                this.stop()
                return
              }
            }
          }
        }

        if (!this.noDb) {
          await this.statusProvider.saveArkiveMetadata({
            chain: this.chain,
            blockNumber: Number(logOrBlock.blockNumber),
            error,
            store: this.store,
            type: logOrBlock.type,
            arkiveId: this.arkiveId,
            arkiveMajorVersion: this.arkiveVersion,
            arkiveMinorVersion: this.arkiveMinorVersion,
          })
        }
      }

      const endTime = performance.now()

      const { blocksPerSecond, itemsPerSecond } = getBlocksPerSecond({
        startTime,
        endTime,
        blockRange: Number(this.blockRange),
        items: logsAndBlocks.length,
      })

      logger(this.chain).info(
        `Processed blocks ${this.processedBlockHeight}-${nextFromBlock} in ${
          (endTime - startTime).toFixed(3)
        }ms (${blocksPerSecond.toFixed(3)} blocks/s - ${
          itemsPerSecond.toFixed(3)
        } items/s)`,
      )

      this.logsQueue.delete(this.processedBlockHeight)
      this.blocksQueue.delete(this.processedBlockHeight)
      this.agnosticLogsQueue.delete(this.processedBlockHeight)
      logger(this.chain).debug(
        `Processed block ${this.processedBlockHeight}...`,
      )

      this.processedBlockHeight = nextFromBlock
    }
  }

  private async checkIndexedBlockHeights() {
    if (this.noDb) return
    const indexedBlockHeight = await this.statusProvider
      .getIndexedBlockHeight({
        chain: this.chain,
        arkiveId: this.arkiveId.toString(),
        arkiveVersion: this.arkiveVersion.toString(),
      })

    logger(this.chain).debug(
      `Indexed block height for ${this.chain}: ${indexedBlockHeight}...`,
    )

    if (
      indexedBlockHeight && (indexedBlockHeight + 1) > this.processedBlockHeight
    ) {
      logger(this.chain).debug(
        `Setting processed block height to ${indexedBlockHeight + 1}...`,
      )
      this.processedBlockHeight = BigInt(indexedBlockHeight) + 1n
    }
  }

  private finalChecks() {
    for (const blockSource of this.blockSources) {
      if (
        blockSource.startBlockHeight !== 'live' &&
        blockSource.startBlockHeight < this.processedBlockHeight
      ) {
        blockSource.startBlockHeight =
          ((this.processedBlockHeight - blockSource.startBlockHeight) /
                blockSource.blockInterval + 1n) * blockSource.blockInterval +
          blockSource.startBlockHeight
      }
    }
    if (
      this.blockSources.length > 0 &&
      this.normalizedContracts.contracts.length === 0 &&
      this.agnosticEvents.size === 0
    ) {
      this.fetchInterval = 100
    }
  }

  private async getLiveBlockHeight() {
    if (this.fetchedBlockHeight + this.blockRange < this.liveBlockHeight) {
      return
    }
    logger(this.chain).debug(`Fetching live block height...`)
    const block = await this.client.getBlockNumber()
    logger(this.chain).debug(`Live block height for ${this.chain}: ${block}...`)
    this.liveBlockHeight = block
  }

  private loadBlockHandlers() {
    if (this.blockSources.length === 0) return
    logger(this.chain).debug(`Loading block handlers for ${this.chain}...`)
    for (const blockSource of this.blockSources) {
      if (blockSource.startBlockHeight === 'live') {
        if (this.processedBlockHeight === 0n) {
          this.processedBlockHeight = this.liveBlockHeight
        }
        continue
      }

      if (
        this.processedBlockHeight === 0n ||
        blockSource.startBlockHeight < this.processedBlockHeight
      ) {
        this.processedBlockHeight = blockSource.startBlockHeight
      }
    }
  }

  private loadContracts() {
    logger(this.chain).debug(
      `Processing raw contracts for ${this.chain}...`,
    )

    for (const contract of this.contracts) {
      const { abi, events, sources, id, factorySources } = contract

      const lowestBlockHeight = bigIntMin(
        ...sources.map((s) => {
          return s.startBlockHeight
        }),
      )

      if (
        this.processedBlockHeight === 0n ||
        lowestBlockHeight < this.processedBlockHeight
      ) {
        this.processedBlockHeight = lowestBlockHeight
      }

      if (sources.filter((s) => s.address === '*').length > 0) {
        const source = sources.find((s) => s.address === '*')!
        for (const event of events) {
          const topic = encodeEventTopics({
            abi,
            eventName: event.name,
          })[0]
          this.agnosticEvents.set(
            topic,
            {
              abi,
              handler: event.handler,
              startBlockHeight: source.startBlockHeight,
              contractId: id,
            },
          )
        }
        continue
      }

      for (const source of sources) {
        this.normalizedContracts.contracts.push(source)
        this.addressToId.set(source.address.toLowerCase(), id)
      }

      const topics = []

      for (const event of events) {
        const { name, handler } = event

        const topic = encodeEventTopics({
          abi,
          eventName: name,
        })[0]

        const handlerAndAbi = {
          handler,
          abi,
        }

        this.eventHandlers.set(
          `${topic}-${id}`,
          handlerAndAbi,
        )

        this.normalizedContracts.signatureTopics.push(topic)
        topics.push(topic)
      }

      if (!factorySources) continue

      for (const [contractId, events] of Object.entries(factorySources)) {
        const factoryContract = this.contracts.find((c) => c.id === contractId)
        if (!factoryContract) {
          logger(this.chain).warning(
            `Factory contract ${contractId} not found for ${id}`,
          )
          continue
        }
        const agnosticSource = factoryContract.sources.find((s) =>
          s.address === '*'
        )
        for (const [eventName, eventParameter] of Object.entries(events)) {
          const topic = encodeEventTopics({
            abi: factoryContract.abi,
            eventName,
          })[0]
          if (agnosticSource) {
            const existing = this.agnosticEvents.get(topic)
            if (!existing) {
              this.agnosticEvents.set(
                topic,
                {
                  abi: factoryContract.abi,
                  handler: () => {},
                  startBlockHeight: agnosticSource.startBlockHeight,
                  contractId: factoryContract.id,
                },
              )
            }
          } else {
            this.normalizedContracts.signatureTopics.push(topic)
          }
          this.factorySources.set(topic, {
            eventParameter,
            abi: factoryContract.abi,
            childTopics: topics,
            childContractName: id,
          })
        }
      }
    }
  }

  private async runFactories(
    params: { logs: SafeRpcLog[]; fromBlock: bigint; toBlock: bigint },
  ) {
    const { logs, fromBlock, toBlock } = params

    const joinedChildSources = new Set()
    const joinedChildTopics = new Set()

    for (const log of logs) {
      if (!log.topics[0]) continue

      const factorySource = this.factorySources.get(log.topics[0])
      if (!factorySource) continue

      const { abi, childTopics, eventParameter, childContractName } =
        factorySource

      const decodedTopic = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      })

      const childSource =
        (decodedTopic.args as Record<string, string>)[eventParameter]
      if (!childSource) {
        logger(this.chain).warning(`No child source found for ${log}`)
        continue
      }

      if (
        joinedChildSources.has(childSource) ||
        this.addressToId.has(childSource.toLowerCase())
      ) {
        continue
      } else {
        joinedChildSources.add(childSource)
        await this.spawnChildContract({
          address: childSource,
          name: childContractName,
          startBlockHeight: BigInt(log.blockNumber),
        })
      }
      childTopics.forEach((topic) => joinedChildTopics.add(topic))
    }
    if (joinedChildSources.size === 0) return []

    const childLogs = await this.client.request({
      method: 'eth_getLogs',
      params: [
        {
          address: [...joinedChildSources] as `0x${string}`[],
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          topics: [
            [...joinedChildTopics],
          ] as `0x${string}`[][],
        },
      ],
    })

    logger(this.chain).debug(
      `Fetched ${childLogs.length} child logs from block ${fromBlock} to ${toBlock}...`,
    )

    return childLogs as SafeRpcLog[]
  }

  private async spawnChildContract(
    params: { address: string; name: string; startBlockHeight: bigint },
  ) {
    const { address, name, startBlockHeight } = params

    const contract = this.contracts.find((c) => c.id === name)

    if (!contract) {
      logger(this.chain).error(
        `Error while spawning contract ${name} with address ${address}: contract not found`,
      )
      return
    }

    const source = {
      address,
      startBlockHeight,
    }

    this.normalizedContracts.contracts.push(source)
    this.addressToId.set(source.address.toLowerCase(), name)

    await this.statusProvider.addSpawnedSource({
      chain: this.chain,
      contract: name,
      address,
      startBlockHeight: Number(startBlockHeight),
    })

    logger(this.chain).info(
      `Spawned child contract ${name} with address ${address} at block ${startBlockHeight}`,
    )
  }
}
