import { createCollection } from '../collection/collection.ts'
// import { createEntity } from '../graphql/entity.ts'

// export type ISpawnedSource = {
//   address: string
//   contract: string
//   chain: string
//   startBlockHeight: number
// }

// export const SpawnedSource = createEntity<
//   ISpawnedSource
// >(
//   'SpawnedSource',
//   {
//     address: String,
//     contract: String,
//     chain: String,
//     startBlockHeight: Number,
//   },
// )

export const SpawnedSource = createCollection('SpawnedSource', {
  address: 'string',
  contract: 'string',
  chain: 'string',
  startBlockHeight: 'int',
})
