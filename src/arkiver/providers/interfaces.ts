import { Store } from '../store.ts'

export interface StatusProvider {
  getIndexedBlockHeight(
    params: IndexedBlockHeightParams,
  ): Promise<number>
  saveArkiveMetadata(
    params: SaveArkiveMetadataParams,
  ): Promise<void>
  addSpawnedSource(
    params: AddSpawnedSourceParams,
  ): Promise<void>
}

export interface IndexedBlockHeightParams {
  chain: string
  arkiveVersion: string
  arkiveId: string
}

export interface SaveArkiveMetadataParams {
  chain: string
  blockNumber: number
  type: string
  error: string | undefined
  store: Store
  arkiveId: number
  arkiveMajorVersion: number
  arkiveMinorVersion: number
}

export interface AddSpawnedSourceParams {
  chain: string
  address: string
  contract: string
  startBlockHeight: number
}
