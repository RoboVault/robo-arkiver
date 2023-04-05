import { supportedChains } from "../chains.ts";
import {
  Abi,
  AbiEvent,
  Address,
  Block,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  Log,
  mongoose,
  PublicClient,
  RpcLog,
} from "../deps.ts";
import { Store } from "./store.ts";

export interface Arkive {
  id: number;
  user_id: string;
  name: string;
  public: boolean;
  created_at: string;
  deployment: Omit<Deployment, "arkive">;
}

export interface Deployment {
  id: number;
  arkive_id: number;
  major_version: number;
  minor_version: number;
  created_at: string;
  status: "pending" | "synced" | "error" | "syncing" | "retired";
  file_path: string;
  arkive: Omit<Arkive, "deployment">;
}

export interface IBlockHandler {
  handler: BlockHandler;
  startBlockHeight: bigint | "live";
  blockInterval: bigint;
}

export interface ChainOptions {
  blockRange: bigint;
  rpcUrl: string;
}

export interface ArkiveManifest {
  dataSources: Partial<
    Record<keyof typeof supportedChains, DataSource>
  >;
  // deno-lint-ignore no-explicit-any
  entities: { model: mongoose.Model<any>; list: boolean }[];
  name: string;
}

export type DataSource = {
  contracts?: Contract[];
  blockHandlers?: IBlockHandler[];
  options: ChainOptions;
};

export interface Contract {
  abi: Abi;
  sources: {
    address: Address | "*";
    startBlockHeight: bigint;
  }[];
  events: EventSource[];
  id: string;
}

interface EventSource {
  name: string;
  // deno-lint-ignore no-explicit-any
  handler: EventHandler<any, any>;
}

export type EventHandlerFor<
  TAbi extends Abi,
  TEventName extends ExtractAbiEventNames<TAbi>,
> = EventHandler<ExtractAbiEvent<TAbi, TEventName>, TEventName>;

type OneDeepNonNullable<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

export type SafeLog<TAbiEvent extends AbiEvent> = OneDeepNonNullable<
  Log<bigint, bigint, TAbiEvent, [TAbiEvent], string>
>;

export type SafeRpcLog = OneDeepNonNullable<RpcLog>;

export interface EventHandlerContext<
  TAbiEvent extends AbiEvent,
  TEventName extends string,
> {
  event: SafeLog<TAbiEvent>;
  eventName: TEventName;
  client: PublicClient;
  store: Store;
}

export interface BlockHandlerContext {
  block: SafeBlock;
  client: PublicClient;
  store: Store;
}

export type SafeBlock = OneDeepNonNullable<Block>;

export type EventHandler<
  TAbiEvent extends AbiEvent,
  TEventName extends string,
> = (ctx: EventHandlerContext<TAbiEvent, TEventName>) => Promise<void>;

export type BlockHandler = (ctx: BlockHandlerContext) => Promise<void>;
