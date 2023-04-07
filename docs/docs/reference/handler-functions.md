---
sidebar_position: 2
---

# Handlers

Handlers are functions responsible for processing incoming data from the data
sources defined in the manifest. They transform the data, ensuring it conforms
to the desired format, and store it in the database. With full end-to-end
typesafety, handlers provide a powerful way to customize how data is processed
and stored, allowing you to tailor the system to your specific needs.

## Example handler function

```ts title="handlers/transferHandler.ts"
import { EventHandlerFor } from "https://deno.land/x/robo_arkiver/mod.ts";
import { formatUnits } from "npm:viem";
import { Transfer } from "../entities/transfer.ts";
import erc20 from "../abis/erc20.ts";

export const transferHandler: EventHandlerFor<typeof erc20, "Transfer"> =
	async ({ event, contract }) => {
		const { from, to, value } = event.args;

		const decimals = await contract.read.decimals();

		const formattedValue = parseFloat(formatUnits(value, decimals));

		const timestamp = Number((await client.getBlock({ blockHash: event.blockHash })).timestamp);

		Transfer.create({
			account: from,
			amount: -formattedValue,
			token: event.address,
			timestamp,
		});
		Transfer.create({
			account: to,
			amount: formattedValue,
			token: event.address,
			timestamp,
		});
	};
```
