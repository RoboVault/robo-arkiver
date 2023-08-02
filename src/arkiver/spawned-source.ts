import { createEntity } from '../graphql/entity.ts'

export type ISpawnedSource = {
  address: string
  contract: string
  chain: string
  startBlockHeight: number
}

export const SpawnedSource = createEntity<
  ISpawnedSource
>(
  'SpawnedSource',
  {
    address: String,
    contract: String,
    chain: String,
    startBlockHeight: Number,
  },
)
