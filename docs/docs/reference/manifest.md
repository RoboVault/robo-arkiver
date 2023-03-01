---
sidebar_position: 1
---

# Manifest

The **manifest** is the **configuration file** that defines your **data sources** and **indexing functions**. It is written in TypeScript and is used to **configure** your Arkive. You can define your **data sources** and map them to your **indexing functions** in the **manifest**.

## Data sources
A **data source** is a set of contracts on a **blockchain** that you want to **query** and **index**. For example, you might want to query and index all the **ERC20 transfers** that happen on the **Ethereum** blockchain from a particular **set of contracts**.

You may also define a **block interval** as a **data source**. For example, you might want to run an **indexing function** every **1000 blocks** on **Ethereum**. This is useful if you want to call a **read-only method** on a contract every few blocks.

## Example Manifest file
```ts title="manifest.config.ts"
import type { ArkiveManifest } from "https://raw.githubusercontent.com/RoboVault/arkiver/main/mod.ts";

const manifest: ArkiveManifest = {
	ethereum: {
		contracts: [
			{
				abiPath: "abis/ERC20.json", // The path to the ABI file for the contracts
				sources: [
					{
						address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC contract address
						startBlockHeight: 6082465, // The block height to start indexing from
					}
				],
				eventQueries: [
					{
						handler: "handlers/transfer.ts", // The path to the handler function
						name: "Transfer", // The name of the event
					}
				]
			}
		],

		blockHandlers: [
			{
				handler: "handlers/price.ts", // The path to the handler function
				interval: 1000, // The interval in blocks to run the handler function
			}
		]
	}
};

export default manifest;
```

## Manifest file structure

The **manifest** is a **TypeScript** file that exports a **default** object. The **default** object is a **mapping** of **blockchains** to **data sources**. The **data sources** are defined as an **array** of **objects**.

```ts
const manifest: ArkiveManifest = {
	ethereum: {
		contracts: [
			{
				// ...
			}
		],
		blockHandlers: [
			{
				// ...
			}
		]
	}
};
```

### Contract data source

The **contract data source** is used to **query** and **index** a **set of contracts** on a **blockchain**. The **contract data source** is defined as an **object** with the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `abiPath` | `string` | The **path** to the **ABI** file for the **contracts**. |
| `sources` | `{address: string, startBlockHeight: number }[]` | The **addresses** of the **contracts** which share the **same ABI** and the **block height** to **start indexing** from. |
| `eventQueries` | `{ handler: string, name: string }[]` | The **events** to query from the **contracts** and the path to their respective **handlers**. |

```ts

const manifest: ArkiveManifest = {
	ethereum: {
		contracts: [
			{
				abiPath: "abis/ERC20.json",
				sources: [
					{
						address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
						startBlockHeight: 6082465,
					}
				],
				eventQueries: [
					{
						handler: "handlers/transfer.ts",
						name: "Transfer",
					}
				]
			}
		]
	}
};
```

### Block interval data source

The **block data source** is used to **query** a **blockchain** on a specified **block interval**. The **block data source** is defined as an **object** with the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `handler` | `string` | The **path** to the **handler** function. |
| `interval` | `number` | The **interval** in **blocks** to run the **handler** function. |

```ts
const manifest: ArkiveManifest = {
	ethereum: {
		blockHandlers: [
			{
				handler: "handlers/price.ts",
				interval: 1000,
			}
		]
	}
};
```