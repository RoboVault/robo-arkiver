---
sidebar_position: 2
---

# Manifest

The `Manifest` class serves as the central configuration for your Arkive,
allowing you to define data sources from various blockchains, map them to their
respective handler functions, and set up your database schema using entity
classes. By chaining method calls, you can create a comprehensive, easy-to-read
manifest that outlines your entire Arkive configuration.

## Example manifest

```ts title="manifest.ts"
import { Manifest } from "https://deno.land/x/robo_arkiver/mod.ts";
import erc20 from "./abis/erc20.ts";
import { Transfer } from "./entities/transfer.ts";
import { transferHandler } from "./handlers/transferHandler.ts";

const manifest = new Manifest("my-arkive");

manifest
	.addEntity(Transfer)
	.chain("mainnet", { blockRange: 100n })
	.contract(erc20)
	.addSources({ "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": 16989911n })
	.addEventHandlers({ "Transfer": transferHandler });

export default manifest.build();
```
