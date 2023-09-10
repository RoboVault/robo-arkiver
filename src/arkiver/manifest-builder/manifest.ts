// deno-lint-ignore-file no-explicit-any ban-types
import { supportedChains } from '../../chains.ts'
import { ArkiveManifest, ChainOptions, Chains } from '../types.ts'
import { Abi, mongoose, SchemaComposer } from '../../deps.ts'
import { parseArkiveManifest } from '../manifest-validator.ts'
import { DataSourceBuilder } from './data-source.ts'
import { CollectionFactory } from '../../collection/collection.ts'

export const manifestVersion = 'v1'

export class Manifest<
  TChains extends Partial<Record<Chains, Record<string, Abi>>> = {},
> {
  public manifest: ArkiveManifest

  constructor(name: string) {
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
      collections: [],
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
        TChains[TChain] extends {} ? TChains[TChain] : {}
      >,
    ) => DataSourceBuilder<TContracts>,
  ): Manifest<{ [key in TChain]: TContracts } & TChains>

  public addChain<TChain extends Exclude<Chains, keyof TChains>>(
    chain: TChain,
    options?: Partial<ChainOptions>,
  ): DataSourceBuilder<
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
          TChains[TChain] extends {} ? TChains[TChain] : {}
        >,
      ) => DataSourceBuilder<TContracts>)
      | Partial<ChainOptions>,
  ):
    | Manifest<{ [key in TChain]: TContracts } & TChains>
    | DataSourceBuilder<
      TChains[TChain] extends {} ? TChains[TChain] : {}
    > {
    if (optionsOrBuilderFn && typeof optionsOrBuilderFn === 'function') {
      optionsOrBuilderFn(
        new DataSourceBuilder<
          TChains[TChain] extends {} ? TChains[TChain] : {}
        >(this as any, chain),
      )
      if (!this.manifest.dataSources[chain]?.options.rpcUrl) {
        throw new Error(`RPC URL is required for chain ${chain}`)
      }
      return this as unknown as Manifest<
        { [key in TChain]: TContracts } & TChains
      >
    }

    if (!(chain in supportedChains) && !optionsOrBuilderFn?.rpcUrl) {
      throw new Error(`RPC URL is required for chain ${chain}`)
    }
    return new DataSourceBuilder<
      TChains[TChain] extends {} ? TChains[TChain] : {}
    >(this as any, chain, optionsOrBuilderFn)
  }

  private chain<TChain extends Chains>(
    chain: TChain,
    options?: Partial<ChainOptions>,
  ): DataSourceBuilder<any> {
    return new DataSourceBuilder<
      TChains[TChain] extends {} ? TChains[TChain] : {}
    >(this, chain, options)
  }

  /**
   * @deprecated Use addCollection instead
   */
  private addEntity(entity: mongoose.Model<any>) {
    this.manifest.entities.push({
      model: entity,
      list: true,
      name: entity.modelName,
    })
    return this
  }

  /**
   * @deprecated Use addCollections instead
   */
  private addEntities(entities: mongoose.Model<any>[]) {
    this.manifest.entities.push(...entities.map((entity) => ({
      model: entity,
      list: true,
      name: entity.modelName,
    })))
    return this
  }

  public addCollection(collection: CollectionFactory<any, string>) {
    if (!this.manifest.collections) {
      this.manifest.collections = []
    }
    this.manifest.collections.push({
      collection,
      list: true,
      name: collection._name,
    })
    return this
  }

  public addCollections(
    collections: CollectionFactory<any, string>[],
  ) {
    if (!this.manifest.collections) {
      this.manifest.collections = []
    }
    this.manifest.collections.push(...collections.map((collection) => ({
      collection,
      list: true,
      name: collection._name,
    })))
    return this
  }

  public build() {
    const { problems } = parseArkiveManifest.manifest(this.manifest)
    if (problems) {
      throw new Error(
        `Invalid manifest: \n\t${
          problems.map((p) =>
            `${p.message} at: ${p.path?.map((p) => p.key).join('.')}`
          ).join('\n\t')
        }`,
      )
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
