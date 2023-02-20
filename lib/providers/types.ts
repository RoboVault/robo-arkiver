import { Arkive } from "@types";

export interface StatusProvider {
  getIndexedBlockHeight(
    params: IndexedBlockHeightParams,
  ): Promise<number>;
}

export interface IndexedBlockHeightParams {
  _chain: string;
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
