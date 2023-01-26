import { ethers, Point } from "../deps.ts";
export interface Arkive {
  id: number;
  version_number: number;
  status: string;
  user_id: string;
  name: string;
}

export type ArkiveMessageEvent =
  | NewArkiveMessageEvent
  | WorkerErrorEvent
  | ArkiveSyncedEvent;

export interface NewArkiveMessageEvent {
  topic: "initArkive";
  data: {
    arkive: Arkive;
    manifest: IManifest;
  };
}

export interface WorkerErrorEvent {
  topic: "workerError";
  data: {
    error: Error;
    arkive: Arkive;
  };
}

export interface ArkiveSyncedEvent {
  topic: "synced";
  data: {
    arkive: Arkive;
  };
}

/**
 * @interface IDataSource
 * @description A data source is a collection of contracts and block handlers
 * @property {IChain} chain - The chain the data source is on
 * @property {IContractSource[]} contracts - The contracts to monitor
 * @property {IBlockHandler[]} blockHandlers - The block handlers to monitor
 */
export interface IDataSource {
  chain: IChain;
  contracts?: IContractSource[];
  blockHandlers?: IBlockHandler[];
}

/**
 * @interface IChain
 * @description A chain consists of a name which must also a coingecko platform id and an RPC URL
 * @property {string} name - The name of the chain
 * @property {string} rpcUrl - The RPC URL of the chain
 */
export interface IChain {
  name: string;
  rpcUrl: string;
  blockRange: number;
}

/**
 * @interface IContractSource
 * @description A contract source is a collection of contract addresses and event queries
 * @property {string} abiPath - The path to the ABI file
 * @property {ISource[]} sources - The contract addresses and start block heights
 * @property {string[]} eventQueries - The event queries to monitor
 */
export interface IContractSource {
  abiPath: string;
  sources: {
    address: string;
    startBlockHeight: number;
  }[];
  eventQueries: {
    name: string;
    handler: string;
  }[];
}

/**
 * @interface IBlockHandler
 * @description A block handler is a path to a handler and a start block height
 * @property {string} handlerPath - The path to the handler
 * @property {number} startBlockHeight - The start block height
 * @property {number} blockInterval - The block interval
 */
export interface IBlockHandler {
  handlerPath: string;
  startBlockHeight: number;
  blockInterval: number;
}

export type BlockHandlerFn = (ctx: BlockHandlerContext) => Promise<Point[]>;

export interface BlockHandlerContext {
  block: ethers.providers.Block;
  blockHandlerName: string;
  provider: ethers.providers.JsonRpcProvider;
  chainName: string;
  store: Record<string, unknown>;
}

/**
 * @interface IManifest
 * @description A manifest is a collection of data sources
 * @property {IDataSource[]} dataSources - The data sources
 */
export interface IManifest {
  dataSources: IDataSource[];
}

export interface EventHandlerContext {
  event: ethers.Event;
  provider: ethers.providers.JsonRpcProvider;
  contract: ethers.Contract;
  chainName: string;
  abiName: string;
  eventQueryName: string;
  store: Record<string, unknown>;
}

export type EventHandler = (ctx: EventHandlerContext) => Promise<Point[]>;
