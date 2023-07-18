// deno-lint-ignore-file no-explicit-any
import { Abi, ExtractAbiEvent, ExtractAbiEventNames } from '../../deps.ts'
import { ArkiveLib } from '../../lib/ArkiveLib.ts'
import { getChainObjFromChainName } from '../../utils.ts'
import {
  BlockHandler,
  ChainOptions,
  Chains,
  DataSource,
  EventHandler,
  ValidateSourcesObject,
} from '../types.ts'
import { ContractBuilder, hashAbi } from './contract.ts'
import { Manifest } from './manifest.ts'

type AddContractParams<
  TAbi extends Abi,
  TSources extends Record<string, bigint>,
  TContractName extends string,
> = {
  abi: TAbi
  name: TContractName
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

export class DataSourceBuilder<
  TName extends string,
  TContracts extends Record<string, Abi>,
> {
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

  public setOptions(
    options: Partial<ChainOptions>,
  ): DataSourceBuilder<TName, TContracts> {
    this.dataSource.options = {
      ...this.dataSource.options,
      ...options,
    }
    return this
  }

  #addContract<const TAbi extends Abi, TContractName extends string>(
    nameOrAbi: TContractName | TAbi,
    abi?: TAbi,
  ) {
    if (this.dataSource.contracts == undefined) {
      this.dataSource.contracts = []
    }
    if (typeof nameOrAbi === 'string') {
      if (abi === undefined) {
        throw new Error('ABI is required when passing a name.')
      }
      return new ContractBuilder<
        TAbi,
        TName,
        TContracts & { [key in TContractName]: TAbi }
      >(
        this,
        abi,
        nameOrAbi,
      )
    }
    return new ContractBuilder<TAbi, TName, TContracts>(
      this,
      nameOrAbi,
    )
  }

  private contract<const TAbi extends Abi>(
    abi: TAbi,
  ): ContractBuilder<TAbi, TName, TContracts>

  private contract<const TAbi extends Abi, TContractName extends string>(
    name: TContractName,
    abi: TAbi,
  ): ContractBuilder<TAbi, TName, TContracts & { [key in TContractName]: TAbi }>

  private contract<const TAbi extends Abi, TContractName extends string>(
    nameOrAbi: TContractName | TAbi,
    abi?: TAbi,
  ) {
    return this.#addContract(nameOrAbi, abi)
  }

  public addContract<const TAbi extends Abi>(
    abi: TAbi,
  ): ContractBuilder<TAbi, TName, TContracts>

  public addContract<
    const TAbi extends Abi,
    const TContractName extends string,
  >(
    name: TContractName,
    abi: TAbi,
  ): ContractBuilder<TAbi, TName, TContracts & { [key in TContractName]: TAbi }>

  public addContract<
    const TContractName extends string,
    const TAbi extends Abi,
    TSources extends Record<string, bigint>,
  >(
    params: AddContractParams<TAbi, TSources, TContractName>,
  ): DataSourceBuilder<TName, TContracts & { [key in TContractName]: TAbi }>

  public addContract<
    const TAbi extends Abi,
    const TContractName extends string,
  >(
    name: TContractName,
    abi: TAbi,
    contractBuilderFn: (
      builder: ContractBuilder<TAbi, TName, TContracts>,
    ) => void,
  ): DataSourceBuilder<TName, TContracts & { [key in TContractName]: TAbi }>

  public addContract<
    const TAbi extends Abi,
    const TContractName extends string,
    TSources extends Record<string, bigint> = Record<
      string | number | symbol,
      never
    >,
  >(
    nameOrAbiOrParams:
      | TContractName
      | TAbi
      | AddContractParams<TAbi, TSources, TContractName>,
    abi?: TAbi,
    contractBuilderFn?: (
      builder: ContractBuilder<
        TAbi,
        TName,
        TContracts & { [key in TContractName]: TAbi }
      >,
    ) => void,
  ):
    | ContractBuilder<
      TAbi,
      TName,
      TContracts & { [key in TContractName]: TAbi }
    >
    | DataSourceBuilder<TName, TContracts & { [key in TContractName]: TAbi }> {
    if (contractBuilderFn && typeof nameOrAbiOrParams === 'string') {
      contractBuilderFn(this.#addContract(nameOrAbiOrParams, abi))
      return this as DataSourceBuilder<
        TName,
        TContracts & { [key in TContractName]: TAbi }
      >
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
      return this as DataSourceBuilder<
        TName,
        TContracts & { [key in TContractName]: TAbi }
      >
    }
    return this.#addContract(nameOrAbiOrParams, abi) as ContractBuilder<
      TAbi,
      TName,
      TContracts & { [key in TContractName]: TAbi }
    >
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
        chain.addContract({
          abi,
          name: hashAbi(abi),
          eventHandlers: handlers,
          sources: contract as any,
        })
      }
    })
    return this
  }
}
