import { Arkive, ArkiveManifest } from './types.ts'
import { DataSource } from './data-source.ts'
import { mongoose } from '../deps.ts'
import { assertChain, defaultArkiveData } from '../utils.ts'
import { logger } from '../logger.ts'

export class Arkiver extends EventTarget {
	private readonly manifest: ArkiveManifest
	private arkiveData: Arkive
	private sources: DataSource[] = []
	private mongoConnection?: string
	private rpcUrls: Record<string, string>

	constructor(params: {
		manifest: ArkiveManifest
		mongoConnection?: string
		arkiveData?: Arkive
		rpcUrls: Record<string, string>
	}) {
		super()
		const { mongoConnection, manifest, arkiveData, rpcUrls } = params
		this.manifest = manifest
		this.arkiveData = arkiveData ?? defaultArkiveData
		this.mongoConnection = mongoConnection
		this.rpcUrls = rpcUrls
	}

	public async run() {
		logger().info(
			`Running Arkive - ${this.arkiveData.name}`,
		)
		try {
			if (this.mongoConnection !== undefined) {
				logger().debug(`Connecting to database...`)
				await mongoose.connect(this.mongoConnection, {
					dbName:
						`${this.arkiveData.id}-${this.arkiveData.deployment.major_version}`,
					// deno-lint-ignore no-explicit-any
				} as any)
				logger().debug(`Connected to database`)
			}
			await this.initSources()
		} catch (e) {
			logger().error(`Error running arkiver: ${e}`)
		}
	}

	private async initSources() {
		logger().debug(`Initializing data sources...`)
		const { dataSources } = this.manifest
		for (const [chain, source] of Object.entries(dataSources)) {
			try {
				assertChain(chain)
			} catch (_e) {
				logger().error(`Invalid chain ${chain} in manifest, ignoring...`)
				continue
			}
			const rpcUrl = this.rpcUrls[chain] ?? source.options.rpcUrl
			if (rpcUrl === undefined) {
				logger().error(`No RPC URL found for chain ${chain}`)
				continue
			}
			const dataSource = new DataSource({
				arkiveId: this.arkiveData.id,
				arkiveVersion: this.arkiveData.deployment.major_version,
				blockRange: source.options?.blockRange ?? 100n,
				chain,
				contracts: source.contracts ?? [],
				rpcUrl: rpcUrl,
				blockSources: source.blockHandlers ?? [],
				noDb: this.mongoConnection === undefined,
				arkiveMinorVersion: this.arkiveData.deployment.minor_version,
			})
			await dataSource.run()
			this.sources.push(dataSource)
		}
	}
}
