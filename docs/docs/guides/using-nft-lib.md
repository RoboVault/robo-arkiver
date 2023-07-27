---
sidebar_position: 4
---

# NFT Library
The ERC721 Library is a library for NFTs. It will help you keep track of the balance of accounts, and which NFTs they own, as well as all the metadata of each NFT and its corresponding collection. 

### Usage
To add any library to the Arkive you must add it to the manifest. First add a contract using the `contract` keyword, and then add a library with the `use` keyword.
Example:
```
import { Manifest, Erc721Lib, Erc721Opts } from './deps.ts'

const manifest = new Manifest('Erc721')
const opts = Erc721Opts({
  contract: {"0xbd3531da5cf5857e7cfaa92426877b022e612cf8", 12876179}
  async: true
})
manifest
  .use(AaveLib.create(opts))
export default manifest.build()

```

### Entities 
_Erc721Transfer_

A new Erc721Transfer will be created each time a transfer event is monitored.

	set: reference to the collection this transfer belongs to
	block: block number of Transfer
	hash: hash of Transfer,
	from: from,
	to: to,
	tokenId: ID of token which was transferred

_Erc721Set_

This is the NFT collection which the token being transfered belongs to i.e. CryptoPunks

	address: Address of the collection,
	name: Name of the collection,
	symbol: Symbol of the collection,
	totalSupply: Total issued tokens in the collection,
	burned: Total number of tokens burned or sent to zero address.

_Erc721Token_
This is the NFT token itself.

	set: The Collection the NFT belongs to
	tokenId: The ID of this token
	uri: The uri of the metadata for this object
	metadata: The underlying metadata (traits, etc)

_Erc721Balance_

This entity stores the account balance for a given NFT.

	set: The Collection the NFT belongs to
	address: The Address of the account
	balance: The NFT Balance of the Account
	tokens: Array of tokenIDs owned by this account
