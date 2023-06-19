---
sidebar_position: 3
---

# Entities

Entities are classes that describe the structure of your database schema. By
calling the factory function, you can create entities that represent the tables in your database.
These entities provide a straightforward way to interact with the data,
making it easier to query and manipulate the information within your Arkive.

## Example entity

```ts title="entities/transfer.ts"
import { createEntity } from "https://deno.land/x/robo_arkiver/mod.ts";

interface ITransfer {
	account: string;
	amount: number;
	token: string;
	timestamp: number;
}

export const Transfer = createEntity<ITransfer>("Transfer", {
	account: String,
	amount: {
		type: Number,
		index: true,
	},
	token: String,
	timestamp: {
		type: Number,
		index: true,
	},
});

```
