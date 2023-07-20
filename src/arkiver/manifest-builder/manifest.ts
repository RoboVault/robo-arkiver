// deno-lint-ignore-file no-explicit-any ban-types
import { supportedChains } from '../../chains.ts'
import {
  ArkiveManifest,
  ChainOptions,
  Chains,
  CheckManifestName,
} from '../types.ts'
import { Abi, mongoose, SchemaComposer } from '../../deps.ts'
import { parseArkiveManifest } from '../manifest-validator.ts'
import { DataSourceBuilder } from './data-source.ts'

export const manifestVersion = 'v1'

export class Manifest<
  TName extends string = '',
  TChains extends Partial<Record<Chains, Record<string, Abi>>> = {},
> {
  public manifest: ArkiveManifest<TChains>

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

  public addChain<
    TChain extends Exclude<Chains, keyof TChains>,
    TContracts extends Record<string, Abi>,
  >(
    chain: TChain,
    builderFn: (
      builder: DataSourceBuilder<
        TName,
        TChains[TChain] extends {} ? TChains[TChain] : {}
      >,
    ) => DataSourceBuilder<TName, TContracts>,
  ): Manifest<TName, { [key in TChain]: TContracts } & TChains>

  public addChain<TChain extends Exclude<Chains, keyof TChains>>(
    chain: TChain,
    options?: Partial<ChainOptions>,
  ): DataSourceBuilder<
    TName,
    TChains[TChain] extends {} ? TChains[TChain] : {}
  >

  public addChain<
    TChain extends Exclude<Chains, keyof TChains>,
    TContracts extends Record<string, Abi>,
  >(
    chain: TChain,
    optionsOrBuilderFn?:
      | ((
        builder: DataSourceBuilder<
          TName,
          TChains[TChain] extends {} ? TChains[TChain] : {}
        >,
      ) => DataSourceBuilder<TName, TContracts>)
      | Partial<ChainOptions>,
  ):
    | Manifest<TName, TChains & { [key in TChain]: TContracts }>
    | DataSourceBuilder<
      TName,
      TChains[TChain] extends {} ? TChains[TChain] : {}
    > {
    if (optionsOrBuilderFn && typeof optionsOrBuilderFn === 'function') {
      optionsOrBuilderFn(
        new DataSourceBuilder<
          TName,
          TChains[TChain] extends {} ? TChains[TChain] : {}
        >(this as any, chain),
      )
      if (!this.manifest.dataSources[chain]?.options.rpcUrl) {
        throw new Error(`RPC URL is required for chain ${chain}`)
      }
      return this
    }

    if (!(chain in supportedChains) && !optionsOrBuilderFn?.rpcUrl) {
      throw new Error(`RPC URL is required for chain ${chain}`)
    }
    return new DataSourceBuilder<
      TName,
      TChains[TChain] extends {} ? TChains[TChain] : {}
    >(this, chain, optionsOrBuilderFn)
  }

  private chain<TChain extends Chains>(
    chain: TChain,
    options?: Partial<ChainOptions>,
  ) {
    return new DataSourceBuilder<
      TName,
      TChains[TChain] extends {} ? TChains[TChain] : {}
    >(this, chain, options)
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
    return this.manifest
  }

  public extendSchema(
    callbackFn: (schemaComposer: SchemaComposer) => void,
  ) {
    this.manifest.schemaComposerCustomizer = callbackFn
    return this
  }
}
