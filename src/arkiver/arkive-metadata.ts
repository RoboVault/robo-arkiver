import { createCollection } from '../collection/collection.ts'

export const ArkiveMetadata = createCollection('ArkiverMetadata', {
  _id: 'string',
  processedBlockHeight: 'int',
  chain: 'string',
  eventHandlerCalls: 'int',
  blockHandlerCalls: 'int',
  errors: ['string'],
  arkiveId: 'int',
  arkiveMajorVersion: 'int',
  arkiveMinorVersion: 'int',
})
