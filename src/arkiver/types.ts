import { supportedChains } from '../chains.ts'
import { CollectionFactory } from '../collection/collection.ts'
import {
  Abi,
  AbiEvent,
  AbiEventParameter,
  AbiType,
  Block,
  Database,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiEvents,
  GetContractReturnType,
  Log,
  log,
  mongoose,
  PublicClient,
  RpcLog,
  SchemaComposer,
} from '../deps.ts'
import { Store } from './store.ts'

export interface Arkive {
  id: number
  user_id: string
  name: string
  public: boolean
  created_at: string
  deployment: Omit<Deployment, 'arkive'>
}

export interface Deployment {
  id: number
  arkive_id: number
  major_version: number
  minor_version: number
  created_at: string
  status:
    | 'pending'
    | 'synced'
    | 'error'
    | 'syncing'
    | 'retired'
    | 'paused'
    | 'restarting'
  file_path: string
  arkive: Omit<Arkive, 'deployment'>
}

export interface IBlockHandler {
  handler: BlockHandler
  startBlockHeight: bigint | 'live'
  blockInterval: bigint
  name: string
}

export interface ChainOptions {
  blockRange: bigint
  rpcUrl: string
}

// deno-lint-ignore ban-types
export type Chains = keyof typeof supportedChains | string & {}

export interface ArkiveManifest {
  dataSources: Partial<
    Record<Chains, DataSource>
  >
  // deno-lint-ignore no-explicit-any
  entities: { model: mongoose.Model<any>; list: boolean; name: string }[]
  collections?: {
    // deno-lint-ignore no-explicit-any
    collection: CollectionFactory<any, string>
    list: boolean
    name: string
  }[]
  name: string
  version: string
  schemaComposerCustomizer?: (sc: SchemaComposer) => void
}

export interface DataSource {
  contracts?: Contract[]
  blockHandlers?: IBlockHandler[]
  options: ChainOptions
}

export interface Contract {
  abi: Abi
  sources: {
    address: string
    startBlockHeight: bigint
  }[]
  factorySources?: Record<string, Record<string, string>>
  events: EventSource[]
  id: string
}

interface EventSource {
  name: string
  // deno-lint-ignore no-explicit-any
  handler: EventHandler<any, any, any>
}

export type EventHandlerFor<
  TAbi extends Abi,
  TEventName extends ExtractAbiEventNames<TAbi>,
> = EventHandler<ExtractAbiEvent<TAbi, TEventName>, TEventName, TAbi>

type RecursiveNonNullable<T> = {
  [K in keyof T]-?: RecursiveNonNullable<NonNullable<T[K]>>
}

export type SafeRpcLog = RecursiveNonNullable<RpcLog>

export type EventHandlerContext<
  TAbiEvent extends AbiEvent,
  TEventName extends string,
  TAbi extends Abi,
> = {
  event:
    | Log<
      bigint,
      number,
      false,
      TAbiEvent,
      true
    >
    | never
  eventName: TEventName
  client: PublicClient
  store: Store
  contract: GetContractReturnType<TAbi, PublicClient>
  logger: log.Logger
  db: Database
  getTimestampMs: () => Promise<number>
}

export interface BlockHandlerContext {
  block: SafeBlock
  client: PublicClient
  store: Store
  logger: log.Logger
  db: Database
}

export type SafeBlock = RecursiveNonNullable<Block>

export type EventHandler<
  TAbiEvent extends AbiEvent,
  TEventName extends string,
  TAbi extends Abi,
> = (
  ctx: EventHandlerContext<TAbiEvent, TEventName, TAbi>,
) => Promise<void> | void

export type BlockHandler = (ctx: BlockHandlerContext) => Promise<void> | void

export type MapAbiEventToArgsWithType<
  TAbi extends Abi,
  TType extends AbiType,
> = {
  [
    TEvent in ExtractAbiEvents<TAbi> as TEvent['name']
  ]?: TEvent['inputs'][number] extends
    infer TEventInput extends AbiEventParameter
    ? TEventInput extends { type: TType } ? TEventInput['name']
    : never
    : never
}
