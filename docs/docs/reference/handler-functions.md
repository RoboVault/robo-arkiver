---
sidebar_position: 2
---

# Handler functions

Your **handler functions** are your **functions** written in TypeScript that takes in data from your data sources. It is used to **process** the data and **store** it in the **database**. You can import any **external modules**, query from the **database**, or even make **HTTP requests**.

## Example handler function

```ts title="handlers/transfer.ts"
import { EventHandler } from "https://raw.githubusercontent.com/RoboVault/arkiver/main/mod.ts";
import { ethers } from "npm:ethers";

const handler: EventHandler = async ({ event, contract, db }) => {
	const [ from, to, value ] = event.args;

	const decimals = await contract.decimals();

	const symbol = await contract.symbol();

	const formattedValue = ethers.formatUnits(value, decimals);

	console.log(`${from} sent ${formattedValue} ${symbol} to ${to}`); // "0x... sent 100 USDC to 0x..."
};
