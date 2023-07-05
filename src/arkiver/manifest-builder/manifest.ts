// deno-lint-ignore-file no-explicit-any
import { supportedChains } from '../../chains.ts'
import { ArkiveManifest, ChainOptions, CheckManifestName } from '../types.ts'
import { mongoose, SchemaComposer } from '../../deps.ts'
import { parseArkiveManifest } from '../manifest-validator.ts'
import { DataSourceBuilder } from './data-source.ts'

export const manifestVersion = 'v1'

// deno-lint-ignore ban-types
export type Chains = keyof typeof supportedChains | string & {}

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
    chain: Chains,
    builderFn: (builder: DataSourceBuilder<TName>) => void,
  ): Manifest<TName>

  public addChain(
    chain: Chains,
    options?: Partial<ChainOptions>,
  ): DataSourceBuilder<TName>

  public addChain(
    chain: Chains,
    optionsOrBuilderFn?:
      | ((builder: DataSourceBuilder<TName>) => void)
      | Partial<ChainOptions>,
  ): Manifest<TName> | DataSourceBuilder<TName> {
    if (optionsOrBuilderFn && typeof optionsOrBuilderFn === 'function') {
      optionsOrBuilderFn(new DataSourceBuilder<TName>(this, chain))
      if (!this.manifest.dataSources[chain]?.options.rpcUrl) {
        throw new Error(`RPC URL is required for chain ${chain}`)
      }
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
    return this.manifest
  }

  public extendSchema(
    callbackFn: (schemaComposer: SchemaComposer) => void,
  ) {
    this.manifest.schemaComposerCustomizer = callbackFn
    return this
  }
}
