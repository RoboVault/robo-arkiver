---
sidebar_position: 2
---

# Handlers

Handlers are functions responsible for processing incoming data from the data sources defined in the manifest. They transform the data, ensuring it conforms to the desired format, and store it in the database. With full end-to-end typesafety, handlers provide a powerful way to customize how data is processed and stored, allowing you to tailor the system to your specific needs.

## Example handler function

```ts
import { EventHandlerFor } from "https://raw.githubusercontent.com/RoboVault/arkiver/main/mod.ts";
import erc20 from "../abis/erc20.ts";

export const transferHandler: EventHandlerFor<typeof erc20, "Transfer"> =
  async ({ event }) => {
		const { from, to, value } = event.args;
    // Your data processing and transformation logic here
  };
```
