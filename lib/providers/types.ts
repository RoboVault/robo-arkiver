import { Arkive } from "../types.ts";

export interface StatusProvider {
  getIndexedBlockHeight(
    params: BlockHandlerStatusParams | EventHandlerStatusParams,
  ): Promise<number>;
}

export interface BlockHandlerStatusParams {
  type: "blockHandler";
  _chain: string;
  _blockHandler: string;
  _arkiveName: string;
  _arkiveVersion: string;
  _arkiveUserId: string;
}

export interface EventHandlerStatusParams {
  type: "eventHandler";
  _chain: string;
  _event: string;
  _address: string;
  _abi: string;
  _arkiveName: string;
  _arkiveVersion: string;
  _arkiveUserId: string;
}

export interface ArkiveProvider {
  getArkives(): Promise<Arkive[]>;
  listenNewArkive(callback: (arkive: Arkive) => Promise<void>): void;
  listenDeletedArkive(
    callback: (arkive: Partial<Arkive>) => Promise<void>,
  ): void;
  pullArkive(arkives: Arkive): Promise<void>;
  updateArkiveStatus(arkive: Arkive, status: string): Promise<void>;
  close(): void;
}
