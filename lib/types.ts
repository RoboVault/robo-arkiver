import { ethers, Point } from "@deps";
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
    filter?: Filter;
  }[];
}

export type Filter = [(string | null), (string | null), (string | null)];

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

export type BlockHandlerFn = (ctx: BlockHandlerContext) => Promise<void>;

export interface BlockHandlerContext {
  block: ethers.Block;
  provider: ethers.JsonRpcProvider;
  store: Record<string, unknown>;
}

/**
 * @interface IManifest
 * @description A manifest is a collection of data sources
 * @property {IDataSource[]} dataSources - The data sources
 */
export interface IManifest {
  dataSources: {
    avalanche?: IDataSource;
  };
}

export interface EventHandlerContext {
  event: ethers.EventLog;
  contract: ethers.Contract;
  eventName: string;
  store: Record<string, unknown>;
  provider: ethers.JsonRpcProvider;
}

export type EventHandler = (ctx: EventHandlerContext) => Promise<void>;
