import { supportedChains } from "../chains.ts";
import {
  Abi,
  AbiEvent,
  Address,
  Block,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  Log,
  PublicClient,
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

export interface ArkiveManifest {
  dataSources: Partial<
    Record<typeof supportedChains[number], {
      contracts?: Contract[];
      blockHandlers?: IBlockHandler[];
    }>
  >;
}

export type DataSource = {
  contracts?: Contract[];
  blockHandlers?: IBlockHandler[];
};

export interface Contract {
  abi: Abi;
  sources: {
    address: Address;
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

export interface EventHandlerContext<
  TAbiEvent extends AbiEvent,
  TEventName extends string,
> {
  event: Log<bigint, bigint, TAbiEvent, [TAbiEvent], TEventName>;
  eventName: TEventName;
  client: PublicClient;
  store: Store;
  tempStore: Store;
}

export interface BlockHandlerContext {
  block: Block;
  client: PublicClient;
  store: Store;
  tempStore: Store;
}

export type EventHandler<
  TAbiEvent extends AbiEvent,
  TEventName extends string,
> = (ctx: EventHandlerContext<TAbiEvent, TEventName>) => Promise<void>;

export type BlockHandler = (ctx: BlockHandlerContext) => Promise<void>;
