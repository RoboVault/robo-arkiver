import { mongoose } from '../deps.ts'

interface IArkiverMetadata {
	processedBlockHeight: number
	chain: string
	eventHandlerCalls: number
	blockHandlerCalls: number
	errors: string[]
}

const arkiverMetadataSchema = new mongoose.Schema<IArkiverMetadata>({
	processedBlockHeight: { type: Number, index: true },
	chain: String,
	eventHandlerCalls: Number,
	blockHandlerCalls: Number,
	errors: [String],
})

export const ArkiverMetadata = mongoose.model<IArkiverMetadata>(
	'ArkiveMetadata',
	arkiverMetadataSchema,
	undefined,
	{ overwriteModels: true },
)
