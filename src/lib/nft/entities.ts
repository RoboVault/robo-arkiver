import { createEntity } from '../../graphql/entity.ts'

// @note: "Index: true" enhances graphql queries 
export const ERC721Transfer = createEntity('ERC721Transfer', {
	block: { type: Number, index: true }, 
	hash: String,
	from: String,
	to: String,
	tokenId: String,
})

export const ERC721Balance = createEntity('ERC721Balance', {
	address: String,
	balance: Number,
	tokens: [Number]
})

export const ERC721Token = createEntity('ERC721Token', {
	tokenId: Number,
	uri: String,
	metadata: Object
})
