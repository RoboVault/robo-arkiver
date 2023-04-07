import { Store } from '../store.ts'

export interface StatusProvider {
	getIndexedBlockHeight(
		params: IndexedBlockHeightParams,
	): Promise<number>
	saveArkiveMetadata(
		params: SaveArkiveMetadataParams,
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
}
