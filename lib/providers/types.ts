import { Arkive } from "@types";

export interface StatusProvider {
  getIndexedBlockHeight(
    params: BlockHandlerStatusParams | EventHandlerStatusParams,
  ): Promise<number>;
}

export interface BlockHandlerStatusParams {
  type: "blockHandler";
  _chain: string;
  _blockHandler: string;
  _arkiveVersion: string;
  _arkiveId: string;
}

export interface EventHandlerStatusParams {
  type: "eventHandler";
  _chain: string;
  _event: string;
  _address: string;
  _abi: string;
  _arkiveVersion: string;
  _arkiveId: string;
}

export interface ArkiveProvider {
  getArkives(): Promise<Arkive[]>;
  listenNewArkive(
    callback: (arkive: Arkive) => Promise<void>,
  ): void;
  listenDeletedArkive(
    callback: (arkiveId: { id: number }) => Promise<void>,
  ): void;
  pullArkive(arkives: Arkive): Promise<void>;
  updateDeploymentStatus(arkive: Arkive, status: string): Promise<void>;
  close(): void;
}
