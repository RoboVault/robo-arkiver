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
  listenArkives(callback: (arkives: Arkive) => Promise<void>): void;
  pullArkives(arkives: Arkive[]): void;
  updateArkiveStatus(arkive: Arkive, status: string): void;
  close(): void;
}
