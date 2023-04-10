// deno-lint-ignore-file no-explicit-any
import {
	Abi,
	Block,
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
import { supportedChains } from '../chains.ts'

interface NormalizedContracts {
	contracts: {
		address: string
		startBlockHeight: bigint
	}[]
	signatureTopics: string[]
}

export class DataSource {
	private readonly chain: keyof typeof supportedChains
	private readonly rpcUrl: string
	private readonly client: PublicClient<HttpTransport>
	private readonly blockRange: bigint
	private readonly arkiveId: number
	private readonly arkiveVersion: number
	private readonly statusProvider: StatusProvider
	private readonly contracts: Contract[]
	private readonly blockSources: IBlockHandler[]
	private normalizedContracts: NormalizedContracts = {
		contracts: [],
		signatureTopics: [],
	}
	private readonly agnosticEvents: Map<
		`0x${string}`,
		{ handler: EventHandler<any, any, Abi>; abi: Abi; startBlockHeight: bigint }
	> = new Map() // topic to handler and interface
	private readonly eventHandlers: Map<
		string,
		{ handler: EventHandler<any, any, Abi>; abi: Abi }
	> = new Map() // topic to handler and interface
	private readonly addressToId: Map<
		string,
		string
	> = new Map() // address to uuid
	private readonly blockHandlers: Map<
		string,
		BlockHandler
	> = new Map() // block handler  to block handler
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
				block: Block
				handlers: BlockHandler[]
			}[]
			nextFromBlock: bigint
		}
	> = new Map() // from block to blocks
	private readonly queuePending: {
		logs: Map<bigint, boolean>
		blocks: Map<bigint, boolean>
		agnosticLogs: Map<bigint, boolean>
	} = {
		logs: new Map(),
		blocks: new Map(),
		agnosticLogs: new Map(),
	} // track if some logs or blocks are pending to be processed
	private readonly retryBlocks: Map<bigint, bigint> = new Map() // blocks to retry
	private eventLoops = {
		fetcher: true,
		processor: true,
	}
	private maxQueueSize = 10
	private liveDelay = 2000
	private queueDelay = 500
	private fetchInterval = 500
	private queueFullDelay = 1000
	private readonly store = new Store({
		max: 1000,
	})
	private isLive = false
	private noDb: boolean

	constructor(
		params: {
			contracts: Contract[]
			chain: keyof typeof supportedChains
			rpcUrl: string
			blockRange: bigint
			arkiveId: number
			arkiveVersion: number
			blockSources: IBlockHandler[]
			noDb: boolean
		},
	) {
		this.chain = params.chain
		this.rpcUrl = params.rpcUrl
		this.blockRange = params.blockRange
		this.contracts = params.contracts
		this.blockSources = params.blockSources
		this.client = createPublicClient({
			chain: getChainObjFromChainName(this.chain),
			transport: http(this.rpcUrl),
		})
		this.arkiveId = params.arkiveId
		this.arkiveVersion = params.arkiveVersion
		this.statusProvider = new MongoStatusProvider()
		this.noDb = params.noDb
	}

	public async run() {
		logger().debug(`Running data source for ${this.chain}...`)
		await this.init()
		this.runFetcherLoop()
		this.runProcessorLoop()
	}

	private async init() {
		logger().debug(`Initializing data source for ${this.chain}...`)
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
			for (const [retryFrom, retryTo] of this.retryBlocks) {
				this.fetchLogs(retryFrom, retryTo)
				this.fetchBlocks(retryFrom, retryTo)
				this.fetchAgnosticLogs(retryFrom, retryTo)
			}

			if (
				this.logsQueue.size > this.maxQueueSize ||
				this.blocksQueue.size > this.maxQueueSize ||
				this.agnosticLogsQueue.size > this.maxQueueSize
			) {
				logger().debug(
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

			if (toBlock === this.liveBlockHeight && !this.isLive) this.isLive = true

			if (fromBlock > toBlock) {
				await delay(this.liveDelay)
				continue
			}

			this.fetchLogs(fromBlock, toBlock)
			this.fetchAgnosticLogs(fromBlock, toBlock)
			this.fetchBlocks(fromBlock, toBlock)

			this.fetchedBlockHeight = toBlock + 1n

			await delay(this.fetchInterval)
		}
	}

	private fetchLogs(fromBlock: bigint, toBlock: bigint) {
		if (this.normalizedContracts.contracts.length === 0) {
			this.queuePending.logs.set(fromBlock, false)
			return
		}

		logger().debug(`Fetching logs from block ${fromBlock} to ${toBlock}...`)

		const addresses = this.normalizedContracts.contracts.filter((c) =>
			c.startBlockHeight <= toBlock
		).map((c) => c.address)

		if (addresses.length === 0) {
			this.queuePending.logs.set(fromBlock, false)
			return
		}

		const nextFromBlock = toBlock + 1n

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
		}).then((logs) => {
			if (
				logs.some((l) => {
					return l.blockHash === null ||
						l.blockNumber === null ||
						l.transactionHash === null ||
						l.transactionIndex === null ||
						l.logIndex === null
				})
			) {
				logger().debug(`Some logs still pending, retrying...`)
				this.retryBlocks.set(fromBlock, toBlock)
				return
			}
			logger().debug(
				`Fetched ${logs.length} logs from block ${fromBlock} to ${toBlock}...`,
			)
			this.logsQueue.set(fromBlock, {
				logs: logs as SafeRpcLog[],
				nextFromBlock,
			})
			this.retryBlocks.delete(fromBlock)
		}).catch((e) => {
			logger().error(
				`Error fetching logs from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}, retrying...`,
			)
			this.retryBlocks.set(fromBlock, toBlock)
		})

		this.queuePending.logs.set(fromBlock, true)
	}

	private fetchAgnosticLogs(fromBlock: bigint, toBlock: bigint) {
		if (this.agnosticEvents.size === 0) {
			this.queuePending.agnosticLogs.set(fromBlock, false)
			return
		}

		logger().debug(
			`Fetching agnostic logs from block ${fromBlock} to ${toBlock}...`,
		)

		const topics = Array.from(this.agnosticEvents.entries()).filter(
			([_, { startBlockHeight }]) => startBlockHeight <= toBlock,
		).map(([topic]) => topic)

		if (topics.length === 0) {
			this.queuePending.agnosticLogs.set(fromBlock, false)
			return
		}

		const nextFromBlock = toBlock + 1n

		this.client.request({
			method: 'eth_getLogs',
			params: [
				{
					fromBlock: `0x${fromBlock.toString(16)}`,
					toBlock: `0x${toBlock.toString(16)}`,
					topics: [topics],
				},
			],
		}).then((logs) => {
			if (
				logs.some((l) => {
					return l.blockHash === null ||
						l.blockNumber === null ||
						l.transactionHash === null ||
						l.transactionIndex === null ||
						l.logIndex === null
				})
			) {
				logger().debug(`Some logs still pending, retrying...`)
				this.retryBlocks.set(fromBlock, toBlock)
				return
			}
			logger().debug(
				`Fetched ${logs.length} agnostic logs from block ${fromBlock} to ${toBlock}...`,
			)
			this.agnosticLogsQueue.set(fromBlock, {
				logs: logs as SafeRpcLog[],
				nextFromBlock,
			})
			this.retryBlocks.delete(fromBlock)
		}).catch((e) => {
			logger().error(
				`Error fetching agnostic logs from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}, retrying...`,
			)
			this.retryBlocks.set(fromBlock, toBlock)
		})

		this.queuePending.agnosticLogs.set(fromBlock, true)
	}

	private fetchBlocks(fromBlock: bigint, toBlock: bigint) {
		if (this.blockSources.length === 0) {
			this.queuePending.blocks.set(fromBlock, false)
			return
		}
		logger().debug(`Fetching blocks from block ${fromBlock} to ${toBlock}...`)
		const blockToHandlers = new Map<bigint, BlockHandler[]>()
		const blockSources = this.blockSources.filter((source) =>
			source.startBlockHeight !== 'live' &&
				source.startBlockHeight <= toBlock &&
				source.startBlockHeight >= fromBlock ||
			(source.startBlockHeight === 'live' && this.isLive)
		)
		if (blockSources.length === 0) {
			logger().debug(
				`No filtered block sources found for ${this.chain} at ${this.fetchedBlockHeight}`,
			)
			this.queuePending.blocks.set(fromBlock, false)
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

		const nextFromBlock = toBlock + 1n

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
			if (blocks.some((b) => b.block === null)) {
				logger().debug(`Some blocks still pending, retrying...`)
				this.retryBlocks.set(fromBlock, toBlock)
				return
			}
			logger().debug(
				`Fetched ${blocks.length} blocks from block ${fromBlock} to ${toBlock}...`,
			)
			this.blocksQueue.set(
				fromBlock,
				{
					blocks,
					nextFromBlock,
				},
			)
			this.retryBlocks.delete(fromBlock)
		}).catch((e) => {
			logger().error(
				`Error fetching blocks from block ${fromBlock} to ${toBlock} for ${this.chain}: ${e}, retrying...`,
			)
			this.retryBlocks.set(fromBlock, toBlock)
		})

		this.queuePending.blocks.set(fromBlock, true)
	}

	private async runProcessorLoop() {
		while (this.eventLoops.processor) {
			const logs = this.logsQueue.get(this.processedBlockHeight)
			const logsPending = this.queuePending.logs.get(
				this.processedBlockHeight,
			)
			const blocks = this.blocksQueue.get(this.processedBlockHeight)
			const blocksPending = this.queuePending.blocks.get(
				this.processedBlockHeight,
			)
			const agnosticLogs = this.agnosticLogsQueue.get(
				this.processedBlockHeight,
			)
			const agnosticLogsPending = this.queuePending.agnosticLogs.get(
				this.processedBlockHeight,
			)

			if (
				logsPending === undefined && blocksPending === undefined &&
				agnosticLogsPending === undefined
			) {
				await delay(this.queueDelay)
				continue
			}

			if (
				logsPending === false && blocksPending === false &&
				agnosticLogsPending === false
			) {
				logger().debug(
					`No logs or blocks to process for block ${this.processedBlockHeight}, continuing...`,
				)
				this.processedBlockHeight = this.processedBlockHeight +
					this.blockRange + 1n
				await delay(this.queueDelay)
				continue
			}

			if (
				(!logs && logsPending) || (!blocks && blocksPending) ||
				(!agnosticLogs && agnosticLogsPending)
			) {
				logger().debug(
					`No logs or blocks fetched yet to process for block ${this.processedBlockHeight}, waiting...`,
				)
				await delay(this.queueDelay)
				continue
			}

			logger().debug(
				`Processing logs and blocks from block ${this.processedBlockHeight}...`,
			)

			const logsAndBlocks = [
				...logs?.logs.map((log) => ({
					...log,
					blockNumber: log.blockNumber,
					type: 'log',
				})) ?? [],
				...blocks?.blocks.map((block) => ({
					...block,
					blockNumber: block.block.number,
					type: 'block',
				})) ?? [],
				...agnosticLogs?.logs.map((log) => ({
					...log,
					blockNumber: log.blockNumber,
					type: 'agnosticLog',
				})) ?? [],
			]

			logsAndBlocks.sort((a, b) => {
				a.blockNumber = !(typeof a.blockNumber === 'bigint')
					? BigInt(a.blockNumber ?? 0)
					: a.blockNumber
				b.blockNumber = !(typeof b.blockNumber === 'bigint')
					? BigInt(b.blockNumber ?? 0)
					: b.blockNumber
				return Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n))
			})

			let error: string | undefined

			const startTime = performance.now()

			const nextFromBlock = logs?.nextFromBlock ??
				agnosticLogs?.nextFromBlock ??
				blocks?.nextFromBlock

			logger().info(
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
						logger().error(`No contract ID found for log ${log}`)
						continue
					}
					const handler = this.eventHandlers.get(
						`${log.topics[0]}-${contractId}`,
					)

					if (!handler) {
						throw new Error(
							`No handler set for topic ${log.topics[0]}-${contractId}`,
						)
					}

					const event = decodeEventLog({
						abi: handler.abi,
						data: log.data,
						topics: [log.topics[0]!, ...log.topics.slice(1)],
					})

					try {
						await handler.handler({
							eventName: event.eventName,
							client: this.client,
							store: this.store,
							event: formatLog(log, event),
							contract: getContract({
								abi: handler.abi,
								address: log.address,
								publicClient: this.client,
							}),
							logger: logger(),
						})
					} catch (e) {
						error =
							`Event handler ${handler.handler.name} at block ${log.blockNumber} with arguments:${
								Object.entries(event.args ?? {}).map(([name, arg], idx) =>
									`\n    ${idx} ${name}: ${arg}`
								)
							}\n\n${e.stack}`
						logger().error(error)
					}
				} else if (logOrBlock.type === 'block') {
					const block = logOrBlock as {
						block: SafeBlock
						handlers: BlockHandler[]
					}

					for (const handler of block.handlers) {
						try {
							await handler({
								block: block.block,
								client: this.client,
								store: this.store,
								logger: logger(),
							})
						} catch (e) {
							error =
								`Block handler ${handler.name} at block ${block.block.number}\n\n${e.stack}`
							logger().error(error)
						}
					}
				} else if (logOrBlock.type === 'agnosticLog') {
					const log = logOrBlock as SafeRpcLog

					const topic = log.topics[0]

					if (!topic) {
						logger().error(`No topic found for log ${log}`)
						continue
					}

					const eventHandler = this.agnosticEvents.get(topic)
					if (!eventHandler) {
						logger().error(`No event found for log ${log}`)
						continue
					}

					const event = decodeEventLog({
						abi: eventHandler.abi,
						data: log.data,
						topics: [log.topics[0]!, ...log.topics.slice(1)],
					})

					try {
						await eventHandler.handler({
							eventName: event.eventName,
							client: this.client,
							store: this.store,
							event: formatLog(log, event),
							contract: getContract({
								abi: eventHandler.abi,
								address: log.address,
								publicClient: this.client,
							}),
							logger: logger(),
						})
					} catch (e) {
						error =
							`Agnostic event handler ${eventHandler.handler.name} at block ${log.blockNumber} with arguments:${
								Object.entries(event.args ?? {}).map(([name, arg], idx) =>
									`\n    ${idx} ${name}: ${arg}`
								)
							}\n\n${e.stack}`
						logger().error(error)
					}
				}

				if (!this.noDb) {
					await this.statusProvider.saveArkiveMetadata({
						chain: this.chain,
						blockNumber: Number(logOrBlock.blockNumber),
						error,
						store: this.store,
						type: logOrBlock.type,
					})
				}
			}

			const endTime = performance.now()

			if (nextFromBlock === undefined) {
				logger().error(
					`No nextFromBlock found for logs ${logs}, agnosticLogs ${agnosticLogs}, blocks ${blocks}`,
				)
				this.stop()
				return
			}

			const { blocksPerSecond, itemsPerSecond } = getBlocksPerSecond({
				startTime,
				endTime,
				blockRange: Number(this.blockRange),
				items: logsAndBlocks.length,
			})
			logger().info(
				`Processed blocks ${this.processedBlockHeight}-${nextFromBlock} in ${
					(endTime - startTime).toFixed(3)
				}ms (${blocksPerSecond.toFixed(3)} blocks/s - ${
					itemsPerSecond.toFixed(3)
				} items/s)`,
			)

			this.logsQueue.delete(this.processedBlockHeight)
			this.blocksQueue.delete(this.processedBlockHeight)
			this.agnosticLogsQueue.delete(this.processedBlockHeight)
			this.queuePending.logs.delete(this.processedBlockHeight)
			this.queuePending.blocks.delete(this.processedBlockHeight)
			this.queuePending.agnosticLogs.delete(this.processedBlockHeight)
			logger().debug(`Processed block ${this.processedBlockHeight}...`)

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

		logger().debug(
			`Indexed block height for ${this.chain}: ${indexedBlockHeight}...`,
		)

		if (
			indexedBlockHeight && (indexedBlockHeight + 1) > this.processedBlockHeight
		) {
			logger().debug(
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
		logger().debug(`Fetching live block height...`)
		const block = await this.client.getBlockNumber()
		logger().debug(`Live block height for ${this.chain}: ${block}...`)
		this.liveBlockHeight = block
	}

	private loadBlockHandlers() {
		if (this.blockSources.length === 0) return
		logger().debug(`Loading block handlers for ${this.chain}...`)
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
		logger().debug(
			`Processing raw contracts for ${this.chain}...`,
		)

		for (const contract of this.contracts) {
			const { abi, events, sources, id } = contract

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
						},
					)
				}
				continue
			}

			for (const source of sources) {
				this.normalizedContracts.contracts.push(source)
				this.addressToId.set(source.address.toLowerCase(), id)
			}

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
			}
		}
	}
}
