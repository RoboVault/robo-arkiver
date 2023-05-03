import { mongoose } from '../deps.ts'

interface IArkiverMetadata {
	processedBlockHeight: number
	chain: string
	eventHandlerCalls: number
	blockHandlerCalls: number
	errors: string[]
	arkiveId: number
	arkiveMajorVersion: number
	arkiveMinorVersion: number
}

const arkiverMetadataSchema = new mongoose.Schema<IArkiverMetadata>({
	processedBlockHeight: { type: Number, index: true },
	chain: String,
	eventHandlerCalls: Number,
	blockHandlerCalls: Number,
	errors: [String],
	arkiveId: Number,
	arkiveMajorVersion: Number,
	arkiveMinorVersion: Number,
})

export const ArkiverMetadata = mongoose.model<IArkiverMetadata>(
	'ArkiveMetadata',
	arkiverMetadataSchema,
	undefined,
	{ overwriteModels: true },
)
