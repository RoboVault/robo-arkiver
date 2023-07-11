import { Arkive, ArkiveManifest } from './types.ts'
import { DataSource } from './data-source.ts'
import { defaultArkiveData } from '../utils.ts'
import { logger } from '../logger.ts'

export class Arkiver extends EventTarget {
  private readonly manifest: ArkiveManifest
  private arkiveData: Arkive
  private sources: DataSource[] = []
  private syncedCount = 0
  private rpcUrls: Record<string, string>
  private noDb: boolean

  constructor(params: {
    manifest: ArkiveManifest
    arkiveData?: Arkive
    rpcUrls: Record<string, string>
    noDb: boolean
  }) {
    super()
    const { manifest, arkiveData, rpcUrls } = params
    this.manifest = manifest
    this.arkiveData = arkiveData ?? defaultArkiveData
    this.rpcUrls = rpcUrls
    this.noDb = params.noDb
  }

  public async run() {
    logger('arkiver').info(
      `Running Arkive - ${this.arkiveData.name}`,
    )
    try {
      await this.initSources()
      console.log(
        `Arkive manifest: `,
        this.manifest,
      )
    } catch (e) {
      logger('arkiver').error(`Error running arkiver: ${e}`)
    }
  }

  private async initSources() {
    logger('arkiver').debug(`Initializing data sources...`)
    const { dataSources } = this.manifest
    for (const [chain, source] of Object.entries(dataSources)) {
      if (source === undefined) {
        // this should never happen but just in case
        logger('arkiver').error(`No data source found for chain ${chain}`)
        continue
      }
      // priority for rpcUrl is (highest to lowest):
      // 1. rpcUrl passed into Arkiver constructor (cli args in local mode)
      // 2. rpcUrl passed specified while building manifest
      // 3. default rpcUrl for chain from viem's chain configs
      const rpcUrl = this.rpcUrls[chain] ?? source.options.rpcUrl
      if (rpcUrl === undefined) {
        logger('arkiver').error(`No RPC URL found for chain ${chain}`)
        continue
      }
      source.options.rpcUrl = rpcUrl
      const dataSource = new DataSource({
        arkiveId: this.arkiveData.id,
        arkiveVersion: this.arkiveData.deployment.major_version,
        blockRange: source.options.blockRange,
        chain,
        contracts: source.contracts ?? [],
        rpcUrl: rpcUrl,
        blockSources: source.blockHandlers ?? [],
        noDb: this.noDb,
        arkiveMinorVersion: this.arkiveData.deployment.minor_version,
      })

      dataSource.addEventListener('synced', () => {
        this.syncedCount++
        if (this.syncedCount === Object.entries(dataSources).length) {
          logger('arkiver').info(
            `All chains fully synced!`,
          )
          this.dispatchEvent(new Event('synced'))
        }
      })

      dataSource.addEventListener('error', () => {
        logger('arkiver').error(
          `Error running handlers in ${chain}`,
        )

        this.dispatchEvent(new Event('handlerError'))
      })

      await dataSource.run()
      this.sources.push(dataSource)
    }
  }
}
