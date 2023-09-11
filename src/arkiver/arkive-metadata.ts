import { createCollection } from '../collection/collection.ts'

export const ArkiveMetadata = createCollection('ArkiverMetadata', {
  _id: 'string',
  processedBlockHeight: 'number',
  chain: 'string',
  eventHandlerCalls: 'number',
  blockHandlerCalls: 'number',
  errors: ['string'],
  arkiveId: 'number',
  arkiveMajorVersion: 'number',
  arkiveMinorVersion: 'number',
})
