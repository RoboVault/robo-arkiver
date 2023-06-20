import { createEntity } from '../../graphql/entity.ts'
import { Types } from 'npm:mongoose'

// @note: "Index: true" enhances graphql queries
export const Erc721Transfer = createEntity('Erc721Transfer', {
  set: { type: Types.ObjectId, ref: 'Erc721Set' },
  block: { type: Number, index: true },
  hash: String,
  from: String,
  to: String,
  tokenId: String,
})

export const Erc721Set = createEntity('Erc721Set', {
  address: String,
  name: String,
  symbol: String,
  totalSupply: Number,
  burned: Number,
})

export const Erc721Token = createEntity('Erc721Token', {
  set: { type: Types.ObjectId, ref: 'Erc721Set' },
  tokenId: Number,
  uri: String,
  metadata: Object,
})

export const Erc721Balance = createEntity('Erc721Balance', {
  set: { type: Types.ObjectId, ref: 'Erc721Set' },
  address: String,
  balance: Number,
  tokens: [{ type: Types.ObjectId, ref: 'Erc721Token' }],
})
