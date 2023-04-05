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
import { Balance } from "./entities/balance.ts";
import { transfer } from "./handlers/transfer.ts";

const manifest = new Manifest("my-arkive");

manifest
	.chain("avalanche")
	.contract(erc20)
	.addSources({ "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664": 27347402n })
	.addEventHandlers({ "Transfer": transferHandler });

export default manifest
	.addEntity(Balance)
	.build();
```
