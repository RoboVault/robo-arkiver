import { createEntity } from '../graphql/entity.ts'

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

export const ArkiverMetadata = createEntity<IArkiverMetadata>(
  'ArkiverMetadata',
  {
    processedBlockHeight: { type: Number, index: true },
    chain: { type: String, index: true },
    eventHandlerCalls: Number,
    blockHandlerCalls: Number,
    errors: [String],
    arkiveId: Number,
    arkiveMajorVersion: Number,
    arkiveMinorVersion: Number,
  },
)
