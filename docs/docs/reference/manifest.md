---
sidebar_position: 2
---

# Manifest

The `Manifest` class serves as the central configuration for your Arkive, allowing you to define data sources from various blockchains, map them to their respective handler functions, and set up your database schema using entity classes. By chaining method calls, you can create a comprehensive, easy-to-read manifest that outlines your entire Arkive configuration.

## Example manifest

```ts title="manifest.ts"
import { Manifest } from "https://raw.githubusercontent.com/RoboVault/arkiver/main/mod.ts";
import { Balance } from "./entities/balance.ts";
import { transfer } from "./handlers/transfer.ts";

const manifest = new Manifest();

manifest
  .addEntity(Balance)
  .addChain("avalanche")
  .addContract(erc20)
  .addSource("0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", 27347402n)
  .addEventHandler("Transfer", transferHandler);

export default manifest.build();
```