import { supportedChains } from '../chains.ts'
import { CollectionFactory } from '../collection/collection.ts'
import {
  Abi,
  AbiEvent,
  AbiEventParameter,
  AbiType,
  Block,
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

declare module 'npm:abitype' {
  export interface Config {
    StrictAbiType: true
  }
}

export type Arkive = {
  id: number
  user_id: string
  name: string
  public: boolean
  created_at: string
  deployment: Omit<Deployment, 'arkive'>
}

export type Deployment = {
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

export type IBlockHandler = {
  handler: BlockHandler
  startBlockHeight: bigint | 'live'
  blockInterval: bigint
  name: string
}

export type ChainOptions = {
  blockRange: bigint
  rpcUrl: string
}

// deno-lint-ignore ban-types
export type Chains = keyof typeof supportedChains | string & {}

export type ArkiveManifest = {
  dataSources: Partial<
    Record<Chains, DataSource>
  >
  // deno-lint-ignore no-explicit-any
  entities: { model: mongoose.Model<any>; list: boolean; name: string }[]
  collections: {
    // deno-lint-ignore no-explicit-any
    collection: CollectionFactory<any, string>
    list: boolean
    name: string
  }[]
  name: string
  version: string
  schemaComposerCustomizer?: (sc: SchemaComposer) => void
}

export type DataSource = {
  contracts?: Contract[]
  blockHandlers?: IBlockHandler[]
  options: ChainOptions
}

export type Contract = {
  abi: Abi
  sources: {
    address: string
    startBlockHeight: bigint
  }[]
  factorySources?: Record<string, Record<string, string>>
  events: EventSource[]
  id: string
}

type EventSource = {
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

export type SafeLog<TAbiEvent extends AbiEvent> = Log<
  bigint,
  number,
  false,
  TAbiEvent,
  true
>

export type SafeRpcLog = RecursiveNonNullable<RpcLog>

export type EventHandlerContext<
  TAbiEvent extends AbiEvent,
  TEventName extends string,
  TAbi extends Abi,
> = {
  event: SafeLog<TAbiEvent>
  eventName: TEventName
  client: PublicClient
  store: Store
  contract: GetContractReturnType<TAbi, PublicClient>
  logger: log.Logger
}

export type BlockHandlerContext = {
  block: SafeBlock
  client: PublicClient
  store: Store
  logger: log.Logger
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

type ValidNameChars =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '-'
  | '_'

export type CheckManifestName<Name extends string, FullName extends string> =
  Name extends `${infer First}${infer Rest}`
    ? First extends ValidNameChars | Capitalize<ValidNameChars>
      ? CheckManifestName<Rest, FullName>
    : `Invalid character in manifest name: ${First}`
    : FullName

export type HexString<Str extends string, Length extends number> = Str extends
  `0x${infer Rest}`
  ? InnerHexStr<Rest, Length> extends number
    ? InnerHexStr<Rest, Length> extends Length ? Str
    : `Invalid hex string length. Expected ${Length}, got ${InnerHexStr<
      Rest,
      Length
    >}`
  : `Invalid hex character in string: ${InnerHexStr<Rest, Length>}`
  : 'Missing 0x prefix'

type InnerHexStr<
  Str extends string,
  Length extends number,
  LengthStore extends never[] = [],
> = Str extends `${infer First}${infer Rest}`
  ? First extends HexChars | Capitalize<HexChars>
    ? InnerHexStr<Rest, Length, [...LengthStore, never]>
  : First
  : LengthStore['length'] extends Length ? Length
  : LengthStore['length']

type HexChars =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'

export type ValidateSourcesObject<Sources extends Record<string, bigint>> =
  keyof Sources extends string
    ? keyof Sources extends HexString<keyof Sources, 40> | '*'
      ? keyof Sources extends '*' ? Sources
      : keyof Sources extends HexString<keyof Sources, 40> ? Sources
      : 'Can\'t mix wildcard and specific addresses'
    : HexString<keyof Sources, 40>
    : `Source addresses must be strings`

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
