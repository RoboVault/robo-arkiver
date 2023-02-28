---
sidebar_position: 2
---

# Create a new Arkive

An **Arkive** is a directory containing a `manifest.config.ts` file and one or more **TypeScript** files which contain your handler functions. All your **data sources** are defined in the `manifest.config.ts` file and the **handler functions** are used to **process** the data. **No need** to learn _3 different languages and schemas_ to index blockchain data anymore, enjoy **full type safety** and a **single language** for everything.

## Create your first Arkive

To create a new Arkive, run the following command:

```bash
arkiver init my-arkive
```

This will scaffold a new Arkive in the `my-arkive` directory.

:::tip
If you are using VSCode with the official Deno extension, make sure to initialize the workspace by running the `Deno: Initialize Workspace Configuration` command in the new directory to enable the Deno language server.
:::

## Project Structure
After running the `arkiver init` command, your project directory should look like this:
```
my-arkive
├── abis
│   └── ERC20.json
├── handlers
│   └── transfer.ts
└── manifest.config.ts
```

### Project structure rundown
- `/abis/` - Contains the ABI files for your contracts.
- `/handlers/` - Contains the handler functions for your data sources.
- `/manifest.config.ts` - Contains the configuration for your Arkive. This is where you define your data sources and map them to your handler functions.

We will go through each of these files in the next sections.
