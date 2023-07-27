---
sidebar_position: 5
---

# Aave Library
The 

### Usage
To add any library to the Arkive you must add it to the manifest. First add a contract using the `contract` keyword, and then add a library with the `use` keyword.
Example:
```
import { Manifest, AaveLib, type AaveOpts  } from './deps.ts'

const manifest = new Manifest('Aave')
const opts = AaveOpts({
  secondsInterval: how big of a window to snapshot e.g. daily, minutely, etc...
  startBlockHeight: beginning of the index
  blockInterval: How often to update within the snapshot window.
})
manifest
  .use(AaveLib.create(opts))
export default manifest.build()

```

### Entities 
_AaveIntervalData_

This is the Aave Interval data which shows you the lending and borrow rate over time. Each time a snapshot is captured a new interval data object is created
	pool: The Aave pool the interval data is pertaining to
	timestamp: timestamp of event
	liquidityRate: Supply Rate
	variableBorrowRate: Variable borrow rate,
	stableBorrowRate: Stable borrow rate
	totalSupply: Total Supply of receipt tokens
	totalDebt: total borrowed

_LendingPool_
The lending pool object which contains the symbol and tokens of each pool.
	protocol: The protocol this pool is on
	network: The network this pool is on
	underlyingSymbol: The symbol of the pool
	underlying: The Token objects in the pool.

_Erc20Token_ 
The token object holds the symbol and decimals information of a given ERC20
	address: Address of token
	network: Network of token
	decimals: Number of decimals of the token
	symbol: Symbol of the token