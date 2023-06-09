import { createEntity } from '../../graphql/entity.ts'
import { Types } from 'npm:mongoose'

// @note: "Index: true" enhances graphql queries 
export const ERC721Transfer = createEntity('ERC721Transfer', {
	set: { type: Types.ObjectId, ref: 'ERC721Set'},
	block: { type: Number, index: true }, 
	hash: String,
	from: String,
	to: String,
	tokenId: String,
})

export const ERC721Set = createEntity('ERC721Set', {
	address: String,
	name: String,
	symbol: String,
	totalSupply: Number
})

export const ERC721Balance = createEntity('ERC721Balance', {
	set: { type: Types.ObjectId, ref: 'ERC721Set'},
	address: String,
	balance: Number,
	tokens: [Number]
})

export const ERC721Token = createEntity('ERC721Token', {
	set: { type: Types.ObjectId, ref: 'ERC721Set'},
	tokenId: Number,
	uri: String,
	metadata: Object
})
