// deno-lint-ignore-file no-explicit-any
import { supportedChains } from '../chains.ts'
import {
  ArkiveManifest,
  BlockHandler,
  ChainOptions,
  CheckManifestName,
  Contract,
  DataSource,
  EventHandler,
  HexString,
  ValidateSourcesObject,
} from './types.ts'
import {
  Abi,
  crypto,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  mongoose,
} from '../deps.ts'
import { getChainObjFromChainName } from '../utils.ts'
import { parseArkiveManifest } from './manifest-validator.ts'
import { ArkiveLib } from '../lib/ArkiveLib.ts'

export const manifestVersion = 'v1'

export class Manifest<TName extends string = ''> {
  public manifest: ArkiveManifest

  constructor(name: CheckManifestName<TName, TName>) {
    if (name === undefined) {
      throw new Error('Manifest name is required.')
    }
    if (name.search(/[^a-zA-Z0-9_-]/g) !== -1) {
      throw new Error(`Invalid name: ${name}`)
    }
    const formattedName = name.replace(' ', '-').toLowerCase()

    this.manifest = {
      dataSources: {},
      entities: [],
      name: formattedName,
      version: manifestVersion,
    }
  }

  public addChain(
    chain: keyof typeof supportedChains,
    builderFn: (builder: DataSourceBuilder<TName>) => void,
  ): Manifest<TName>

  public addChain(
    chain: keyof typeof supportedChains,
    options?: Partial<ChainOptions>,
  ): DataSourceBuilder<TName>

  public addChain(
    chain: keyof typeof supportedChains,
    optionsOrBuilderFn?:
      | ((builder: DataSourceBuilder<TName>) => void)
      | Partial<ChainOptions>,
  ): Manifest<TName> | DataSourceBuilder<TName> {
    if (optionsOrBuilderFn && typeof optionsOrBuilderFn === 'function') {
      optionsOrBuilderFn(new DataSourceBuilder<TName>(this, chain))
      return this
    }

    return new DataSourceBuilder<TName>(this, chain, optionsOrBuilderFn)
  }

  private chain(
    chain: keyof typeof supportedChains,
    options?: Partial<ChainOptions>,
  ) {
    return new DataSourceBuilder<TName>(this, chain, options)
  }

  public addEntity(entity: mongoose.Model<any>) {
    this.manifest.entities.push({
      model: entity,
      list: true,
      name: entity.modelName,
    })
    return this
  }

  public addEntities(entities: mongoose.Model<any>[]) {
    this.manifest.entities.push(...entities.map((entity) => ({
      model: entity,
      list: true,
      name: entity.modelName,
    })))
    return this
  }

  public build() {
    const { problems } = parseArkiveManifest.manifest(this.manifest)
    if (problems) {
      throw new Error(`Invalid manifest: ${problems}`)
    }
    console.log(this.manifest)
    return this.manifest
  }
}

export class DataSourceBuilder<TName extends string> {
  public dataSource: DataSource

  constructor(
    private builder: Manifest<TName>,
    public chain: keyof typeof supportedChains,
    public options: Partial<ChainOptions> = {},
  ) {
    const dataSource: DataSource = this.builder.manifest.dataSources[chain] ?? {
      options: {
        blockRange: 3000n,
        rpcUrl: getChainObjFromChainName(chain).rpcUrls.public.http[0],
        ...options,
      },
    }
    this.builder.manifest.dataSources[chain] = this.dataSource = dataSource
  }

  #addContract<const TAbi extends Abi>(
    nameOrAbi: string | TAbi,
    abi?: TAbi,
  ) {
    if (this.dataSource.contracts == undefined) {
      this.dataSource.contracts = []
    }
    if (typeof nameOrAbi === 'string') {
      if (abi === undefined) {
        throw new Error('ABI is required when passing a name.')
      }
      return new ContractBuilder<TAbi, TName>(this, abi, nameOrAbi)
    }
    return new ContractBuilder<TAbi, TName>(this, nameOrAbi)
  }

  private contract<const TAbi extends Abi>(
    abi: TAbi,
  ): ContractBuilder<TAbi, TName>

  private contract<const TAbi extends Abi>(
    name: string,
    abi: TAbi,
  ): ContractBuilder<TAbi, TName>

  private contract<const TAbi extends Abi>(
    nameOrAbi: string | TAbi,
    abi?: TAbi,
  ) {
    return this.#addContract(nameOrAbi, abi)
  }

  public addContract<const TAbi extends Abi>(
    abi: TAbi,
  ): ContractBuilder<TAbi, TName>

  public addContract<const TAbi extends Abi>(
    name: string,
    abi: TAbi,
  ): ContractBuilder<TAbi, TName>

  public addContract<const TAbi extends Abi>(
    name: string,
    abi: TAbi,
    contractBuilderFn: (builder: ContractBuilder<TAbi, TName>) => void,
  ): DataSourceBuilder<TName>

  public addContract<const TAbi extends Abi>(
    nameOrAbi: string | TAbi,
    abi?: TAbi,
    contractBuilderFn?: (builder: ContractBuilder<TAbi, TName>) => void,
  ): ContractBuilder<TAbi, TName> | DataSourceBuilder<TName> {
    if (contractBuilderFn) {
      contractBuilderFn(this.#addContract(nameOrAbi, abi))
      return this
    }
    return this.#addContract(nameOrAbi, abi)
  }

  public addBlockHandler(
    options: {
      startBlockHeight: bigint | 'live'
      blockInterval: number
      handler: BlockHandler
    },
  ) {
    if (this.dataSource.blockHandlers == undefined) {
      this.dataSource.blockHandlers = []
    }

    const { blockInterval, startBlockHeight, handler } = options

    this.dataSource.blockHandlers.push({
      handler,
      startBlockHeight,
      blockInterval: BigInt(blockInterval),
      name: handler.name,
    })
    return this
  }

  public use(libs: ArkiveLib[]) {
    libs.forEach((lib) => {
      const chain = this.builder.addEntities(lib.getEntities())
        .addChain(this.chain, {
          blockRange: this.options.blockRange ? this.options.blockRange : 3000n,
        })
      if (Object.keys(lib.getBlockHandler()).length > 0) {
        chain.addBlockHandler(lib.getBlockHandler())
      }
      const sources = lib.getDataSources()
      for (const info of sources) {
        const { contract, handlers, abi } = info
        chain.addContract(abi)
          .addSources(contract as any)
          .addEventHandlers(handlers)
      }
    })
    return this
  }
}

export class ContractBuilder<
  const TAbi extends Abi,
  TName extends string,
> {
  public contract: Contract

  constructor(
    private builder: DataSourceBuilder<TName>,
    abi: TAbi,
    name?: string,
  ) {
    const existing = this.builder.dataSource.contracts?.find(
      (contract) => contract.abi === abi,
    )
    if (existing !== undefined) {
      this.contract = existing
    } else {
      this.contract = {
        abi,
        sources: [],
        events: [],
        id: name ?? hashAbi(abi),
      }
      this.builder.dataSource.contracts!.push(this.contract)
    }
  }

  private addSource<TAddress extends string>(
    address: HexString<TAddress, 40> | '*',
    startBlockHeight: bigint,
  ) {
    if (address === '*' && this.contract.sources.length > 0) {
      throw new Error('Cannot add wildcard source after other sources.')
    }
    this.contract.sources.push({
      address: address,
      startBlockHeight,
    })
    return this
  }

  public addSources<TSources extends Record<string, bigint>>(
    sources: ValidateSourcesObject<TSources>,
  ) {
    if (typeof sources !== 'object') {
      throw new Error('Sources must be an object.')
    }
    if (
      (sources as Record<string, bigint>)['*'] !== undefined &&
      (Object.keys(sources).length > 1 || this.contract.sources.length > 0)
    ) {
      throw new Error('Cannot add wildcard source after other sources.')
    }

    for (const [address, startBlockHeight] of Object.entries(sources)) {
      this.addSource(address as any, startBlockHeight)
    }
    return this
  }

  private addEventHandler<
    TEventName extends ExtractAbiEventNames<TAbi>,
    TEventHandler extends EventHandler<
      ExtractAbiEvent<TAbi, TEventName>,
      TEventName,
      TAbi
    >,
  >(
    name: TEventName,
    handler: TEventHandler,
  ) {
    const existing = this.contract.events.find(
      (event) => event.name === name,
    )

    if (existing !== undefined) {
      throw new Error(`Cannot add event ${name} more than once.`)
    }

    this.contract.events.push({
      name,
      handler,
    })
    return this
  }

  public addEventHandlers(
    handlers: Partial<
      {
        [eventName in ExtractAbiEventNames<TAbi>]: EventHandler<
          ExtractAbiEvent<TAbi, eventName>,
          eventName,
          TAbi
        >
      }
    >,
  ) {
    if (typeof handlers !== 'object') {
      throw new Error('Event handlers must be an object.')
    }
    for (const [name, handler] of Object.entries(handlers)) {
      this.addEventHandler(name, handler as any)
    }
    return this
  }
}

const hashAbi = (abi: Abi) => {
  const textEncoder = new TextEncoder()
  const str = JSON.stringify(abi)
  const hash = crypto.subtle.digestSync('SHA-256', textEncoder.encode(str))
  const uint8Array = new Uint8Array(hash)
  const hexString = Array.from(
    uint8Array,
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
  return hexString
}
