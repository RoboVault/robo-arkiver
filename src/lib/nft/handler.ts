import { type EventHandlerFor, Store } from '../../../mod.ts'
import { Erc721 } from './Erc721.ts'
import {
  Erc721Balance,
  Erc721Set,
  Erc721Token,
  Erc721Transfer,
} from './entities.ts'

export async function getCollection(address: String, contract, store: Store) {
  let record = await store.retrieve(
    `collection::${address}`,
    () => Erc721Set.findOne({ address }),
  )
  if (!record) {
    const name = await contract.read.name()
    const symbol = await contract.read.symbol()
    record = new Erc721Set({
      address,
      name,
      symbol,
      totalSupply: 0,
      burned: 0,
    })
    await record.save()
    store.set(`collection::${address}`, record)
  }
  return record
}

export async function getHolder(collection, user: String, store: Store) {
  let record = await store.retrieve(
    `holder::${user}`,
    async () => Erc721Balance.findOne({ set: collection, address: user }),
  )
  if (!record) {
    record = new Erc721Balance({
      set: collection,
      address: user,
      balance: 0,
      tokens: [],
    })
    await record.save()
    store.set(`holder::${user}`, record)
  }
  return record
}

export async function getToken(store: Store, set, tokenId: number) {
  let record = await store.retrieve(
    `token::${tokenId}`,
    async () => Erc721Token.findOne({ set, tokenId }),
  )
  if (!record) {
    record = new Erc721Token({
      set,
      tokenId,
    })
    await record.save()
    store.set(`token::${tokenId}`, record)
  }
  return record
}

function sleep(ms: number, callback: Function) {
  return new Promise((resolve) => setTimeout(() => resolve(callback()), ms))
}

export function onTransferFactory(async: Boolean) {
  const onTransfer: EventHandlerFor<typeof Erc721, 'Transfer'> = async (
    { event, client, contract, eventName, store },
  ) => {
    const { from, to, tokenId } = event.args
    let collection = await getCollection(event.address, contract, store)
    let token = await getToken(store, collection, Number(tokenId))
    if (Number(from) == 0) {
      if (async) {
        let uri = await contract.read.tokenURI([Number(tokenId)])
        let metadata = await fetch(uri)
        metadata = await metadata.json()
        token.uri = uri
        token.metadata = metadata
        await token.save()
      } else {
        let uri = await contract.read.tokenURI([Number(tokenId)])
        token.uri = uri
        fetch(uri).then(async (metadata) => {
          metadata = await metadata.json()
          token.metadata = metadata
          token.save()
        })
      }
    }

    const block = Number(event.blockNumber)
    const record = new Erc721Transfer({
      set: collection,
      hash: event.transactionHash,
      block,
      from,
      to,
      tokenId: tokenId,
    })
    record.save()

    if (from === '0x0000000000000000000000000000000000000000') {
      collection.totalSupply += 1
      await collection.save()
    } else if (to === '0x0000000000000000000000000000000000000000') {
      collection.burned += 1
      await collection.save()
    }

    const toHolder = await getHolder(collection, to, store)
    toHolder.balance += 1
    toHolder.tokens.push(token)
    await toHolder.save()

    const fromHolder = await getHolder(collection, from, store)
    fromHolder.balance -= 1
    fromHolder.tokens = fromHolder.tokens.filter((token) => {
      return token.tokenId !== Number(tokenId)
    })
    await fromHolder.save()
  }
  return onTransfer
}
