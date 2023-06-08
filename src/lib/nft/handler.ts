import { formatUnits } from 'npm:viem'
import { Store, type EventHandlerFor } from '../../../mod.ts'
import erc721 from './erc721.ts'
import { ERC721Balance, ERC721Transfer, ERC721Token } from './entities.ts'

export const getHolder = async (client, user, store: Store) => {
	let record = await store.retrieve(`holder::${user}`, async () => ERC721Balance.findOne({address: user}))
	if(!record){
		record = new ERC721Balance({
			address: user,
			balance: 0,
			tokens: []
		})
		store.set(`holder::${user}`, record)
	}
	return record
}

export const getToken = async (store: Store, tokenId: number) => {
	let record = await store.retrieve(`token::${tokenId}`, async () => ERC721Token.findOne({tokenId}))
	if(!record){
		record = new ERC721Token({
			tokenId
		})
		store.set(`token::${tokenId}`, record)
	}
	return record
}

// deno-lint-ignore require-await
export const onTransfer: EventHandlerFor<typeof erc721, 'Transfer'> = async ({ event, client, contract, eventName, store }) => {
	const { from, to, tokenId } = event.args
	if(Number(from) == 0){
		let token = await getToken(store, Number(tokenId))
		let uri = await contract.read.tokenURI([Number(tokenId)])
		token.uri = uri
		let metadata = await fetch(uri)
		metadata = await metadata.json();
		token.metadata = metadata
		await token.save()
	}
	const block = Number(event.blockNumber)
	const record = new ERC721Transfer({
		hash: event.transactionHash,
		block,
		from, 
		to, 
		tokenId: tokenId,
	})
	record.save()

	let holder = await getHolder(client, to, store)
	holder.balance += 1
	let tokens = holder.tokens
	tokens.push(Number(tokenId))
	holder.tokens = tokens
	await holder.save()
	

	holder = await getHolder(client, from, store)
	holder.balance -= 1
	holder.tokens = holder.tokens.filter(token => {return token !== Number(tokenId)})
	await holder.save()

}
