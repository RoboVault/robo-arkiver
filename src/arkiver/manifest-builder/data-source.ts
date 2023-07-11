// deno-lint-ignore-file no-explicit-any
import { Abi, ExtractAbiEvent, ExtractAbiEventNames } from '../../deps.ts'
import { ArkiveLib } from '../../lib/ArkiveLib.ts'
import { getChainObjFromChainName } from '../../utils.ts'
import {
  BlockHandler,
  ChainOptions,
  DataSource,
  EventHandler,
  ValidateSourcesObject,
} from '../types.ts'
import { ContractBuilder } from './contract.ts'
import { Chains, Manifest } from './manifest.ts'

type AddContractParams<
  TAbi extends Abi,
  TSources extends Record<string, bigint>,
> = {
  abi: TAbi
  name?: string
  sources?: ValidateSourcesObject<TSources>
  eventHandlers?: Partial<
    {
      [eventName in ExtractAbiEventNames<TAbi>]: EventHandler<
        ExtractAbiEvent<TAbi, eventName>,
        eventName,
        TAbi
      >
    }
  >
}

export class DataSourceBuilder<TName extends string> {
  public dataSource: DataSource

  constructor(
    private builder: Manifest<TName>,
    public chain: Chains,
    public options: Partial<ChainOptions> = {},
  ) {
    const dataSource: DataSource = this.builder.manifest.dataSources[chain] ?? {
      options: {
        blockRange: options.blockRange ?? 1000n,
        rpcUrl: options.rpcUrl ??
          getChainObjFromChainName(chain)?.rpcUrls.public.http[0] ?? '',
      },
    }
    this.builder.manifest.dataSources[chain] = this.dataSource = dataSource
  }

  public setOptions(options: Partial<ChainOptions>): DataSourceBuilder<TName> {
    this.dataSource.options = {
      ...this.dataSource.options,
      ...options,
    }
    return this
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

  public addContract<
    const TAbi extends Abi,
    TSources extends Record<string, bigint>,
  >(
    params: AddContractParams<TAbi, TSources>,
  ): DataSourceBuilder<TName>

  public addContract<const TAbi extends Abi>(
    name: string,
    abi: TAbi,
    contractBuilderFn: (builder: ContractBuilder<TAbi, TName>) => void,
  ): DataSourceBuilder<TName>

  public addContract<
    const TAbi extends Abi,
    TSources extends Record<string, bigint> = Record<
      string | number | symbol,
      never
    >,
  >(
    nameOrAbiOrParams: string | TAbi | AddContractParams<TAbi, TSources>,
    abi?: TAbi,
    contractBuilderFn?: (builder: ContractBuilder<TAbi, TName>) => void,
  ): ContractBuilder<TAbi, TName> | DataSourceBuilder<TName> {
    if (contractBuilderFn && typeof nameOrAbiOrParams === 'string') {
      contractBuilderFn(this.#addContract(nameOrAbiOrParams, abi))
      return this
    }
    if (typeof nameOrAbiOrParams === 'object' && 'abi' in nameOrAbiOrParams) {
      const { abi, name, sources, eventHandlers } = nameOrAbiOrParams
      let contractBuilder
      if (name) {
        contractBuilder = this.#addContract(name, abi)
      } else {
        contractBuilder = this.#addContract(abi)
      }
      if (sources) {
        contractBuilder.addSources(sources)
      }
      if (eventHandlers) {
        contractBuilder.addEventHandlers(eventHandlers)
      }
      return this
    }
    return this.#addContract(nameOrAbiOrParams, abi)
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
