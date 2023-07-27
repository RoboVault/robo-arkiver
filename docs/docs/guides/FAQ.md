---
sidebar_position: 2
---

# FAQ

## How can I install Arkiver?
You can install the Arkiver CLI by running the following command:

```bash
deno install -A --unstable -n arkiver https://deno.land/x/robo_arkiver/cli.ts
```

If you want to update the Arkiver CLI to the latest version, you can run the
following commands:

```bash
deno uninstall arkiver
deno install --reload -A --unstable -n arkiver https://deno.land/x/robo_arkiver/cli.ts
```

## Why is my Arkive syncing so slowly?
Usually the reason an Arkive is taking a long time to sync is because there are too many RPC requests or Database requests which are not being executed synchronously. In addition you can use caching to get additional speed. See Best Practices & Optimizing Handlers.

## 'eth_getLogs' is unavailable
To make the most of Arkiver, you must use a RPC endpoint with access to historical data. [Infura](http://infura.io/), and [Alchemy](https://www.alchemy.com/) both offer high quality historical endpoints for free. They work well with Arkiver.

## How do I add contracts to the Arkive
First locate the manifest.ts file in the project. In the manifest, there should be something which looks like this.
```
avalanche
	.addContract(ReservoirPairAbi)
	.addSources({
		'0x1F93509b70E936BfF8e27C129a9B99725A51D1cC': 31616108,
		'0x146D00567Eef404c1c0aBF1dfD2abEa9F260B8C7': 31569814
	})
```
The addSources functions takes two parameters, the first being the contract you would like to watch, and the second being the block number to begin watching on. To add another contract, just append it to the sources. If you wish to collect the whole history of the contract you may find its deployment transactions and block number on etherscan (or the corresponding explorer to your chain). 

## How can I explore the data created by Arkiver
For now the primary way to explore data is through the GraphQL explorer. The link to the explorer is given when you start your Arkive or when you deploy it to arkiver.net. GraphQL Explorer is a no-code query builder. On the left side you can toggle the builder. Once the builder is showing you can click on the available fields to add them to your query. 

[img1]

When you're ready you can click the play button in the center of the screen to execute your query. 
Results should be shown on the right.

[img2]

## What chains are supported by Arkiver
* Arbitrum
* Avalanche
* Fuji
* Ethereum
* Fantom
* Polygon
* Optimism
* Mumbai
* Sepolia
* PolygonZkEvm
* Localhost

