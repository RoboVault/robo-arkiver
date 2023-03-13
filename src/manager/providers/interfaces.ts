import { Arkive } from "../../arkiver/types.ts";

export interface StatusProvider {
  getIndexedBlockHeight(
    params: IndexedBlockHeightParams,
  ): Promise<number>;
}

export interface IndexedBlockHeightParams {
  chain: string;
  arkiveVersion: string;
  arkiveId: string;
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
