import { Arkive } from "../types.ts";

export interface StatusProvider {
  getIndexedBlockHeight(
    params: BlockHandlerStatusParams | EventHandlerStatusParams
  ): Promise<number>;
}

export interface BlockHandlerStatusParams {
  type: "blockHandler";
  chain: string;
  blockHandler: string;
}

export interface EventHandlerStatusParams {
  type: "eventHandler";
  chain: string;
  eventName: string;
  address: string;
}

export interface ArkiveProvider {
  getArkives(): Promise<Arkive[]>;
  listenNewArkive(callback: (arkive: Arkive) => Promise<void>): void;
  listenDeletedArkive(
    callback: (arkive: Partial<Arkive>) => Promise<void>
  ): void;
  pullArkive(arkives: Arkive): Promise<void>;
  updateArkiveStatus(arkive: Arkive, status: string): Promise<void>;
  close(): void;
}
