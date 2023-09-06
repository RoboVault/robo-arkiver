import { createCollection } from '../collection/collection.ts'

export const SpawnedSource = createCollection('SpawnedSource', {
  address: 'string',
  contract: 'string',
  chain: 'string',
  startBlockHeight: 'int',
})
