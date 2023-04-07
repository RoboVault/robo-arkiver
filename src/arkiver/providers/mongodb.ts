import { ArkiverMetadata } from '../arkive-metadata.ts'
import {
	IndexedBlockHeightParams,
	SaveArkiveMetadataParams,
	StatusProvider,
} from './interfaces.ts'

export class MongoStatusProvider implements StatusProvider {
	async getIndexedBlockHeight(
		params: IndexedBlockHeightParams,
	): Promise<number> {
		const { chain } = params

		const arkiverMetadata = await ArkiverMetadata.find({ chain }).sort({
			processedBlockHeight: -1,
		}).limit(1)

		return arkiverMetadata[0]?.processedBlockHeight || 0
	}

	async saveArkiveMetadata(
		params: SaveArkiveMetadataParams,
	): Promise<void> {
		const arkiverMetadata = await params.store.retrieve(
			`${params.chain}:${params.blockNumber}:metadata`,
			async () =>
				await ArkiverMetadata.findOne({
					chain: params.chain,
					processedBlockHeight: Number(params.blockNumber),
				}) ??
					new ArkiverMetadata({
						processedBlockHeight: 0,
						chain: params.chain,
						blockHandlerCalls: 0,
						eventHandlerCalls: 0,
					}),
		)
		arkiverMetadata.processedBlockHeight = Number(
			params.blockNumber,
		)
		if (params.type === 'block') {
			arkiverMetadata.blockHandlerCalls++
		} else {
			arkiverMetadata.eventHandlerCalls++
		}
		if (params.error !== undefined) {
			arkiverMetadata.errors.push(params.error)
		}

		params.store.set(
			`${params.chain}:${params.blockNumber}:metadata`,
			arkiverMetadata.save(),
		)
	}
}
