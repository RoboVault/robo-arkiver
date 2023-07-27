---
sidebar_position: 2
---
# Best Practices
## RPC calls and DB queries should be executed in parallel whenever possible
To optimize efficient execution of your handlers, all queries should be executed in parallel with Promise.all().

Instead of:
```
await token0 = client.readContract({ abi, address, functionName: "token0" })
await token1 = client.readContract({ abi, address, functionName: "token1" })
```

Try this: 
```
	const [ token0Address, token1Address ] = await Promise.all([
		client.readContract({ abi, address, functionName: "token0" }),
		client.readContract({ abi, address, functionName: "token1" })
	])
```
## Caching should be used for queries which are repeated
Cache queries to the database like this:
```
	store.retrieve(
		`${from}:${address}:balance`,
		async () =>
			await Balance.findOne({ account: from })
	)
```

## Cache is not permanent storage 
Despite our best efforts, downtimes happens. In the event of a down period there is a possibility of the cache being wiped. In order to prevent logical bugs Cache should only be used to store entities from the database or the results of RPC requests, events which can be replicated and refetched in the event of a cache wipe. 

## Use libraries whenever possible.
Making use of the available libraries will make your life easier and result in less code duplication. Currently our available libraries are:
* NFT Library 
* AAVE Library

## Use numberToHex and fromHex in order to store bigint numbers.
Using normal javascript numbers with Ethereum style bigints will lead to loss of precision. In order to accurately store data it must be stored as a string. 

For example below is the naive implementation one might try: 
```
  userBalance = Number(formatUnits(userBalance, Number(decimals)))
  return new Balance({ user, token, balance: Number(userBalance) })
```
This results in loss of precision if the userBalance is a big enough number. Instead we should store the number as a Hex string using numberToHex()

```
return new Balance({ user, token, balance: numberToHex(userBalance) })
```

When you wish to update the balance in this example you might do something like this:

```
// adjust the value
bal.balance = numberToHex(fromHex(bal.balance, 'bigint') + value)
```

Executing the arithmetic as a bigint keeps the accuracy of the data in tact.