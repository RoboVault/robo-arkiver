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
