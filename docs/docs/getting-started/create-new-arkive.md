---
sidebar_position: 2
---

# Create your first Arkive

An **Arkive** consists of **data sources** which you define and **handler functions** that process the data coming from those sources. All your **data sources** are defined and mapped to their respective **handler functions** in the **`manifest.config.ts`** file and all your **handler functions** are written in plain **TypeScript** files.

## Generate an Arkive using the CLI

To generate a new Arkive from the CLI, run the following command:

```bash
arkiver init my-arkive
```

This will generate an example Arkive in the `my-arkive` directory.

:::tip
If you are using VSCode with the official Deno extension, make sure to initialize the workspace by running the `Deno: Initialize Workspace Configuration` command in the VSCode command palette in the new directory to enable the Deno language server.
:::

## Project Structure
After running the `arkiver init` command, your project directory should look like this:
```
my-arkive
├── abis
│   └── ERC20.json
├── handlers
│   ├── transfer.ts
│   └── price.ts
└── manifest.config.ts
```

### Project structure rundown
- `/abis/` - Contains the ABI files for your contracts.
- `/handlers/` - Contains the functions to handle data coming from your data sources.
- `/manifest.config.ts` - Contains the configuration for your Arkive. This is where you define your data sources and map them to your handler functions.

## Run your Arkive locally

To run your Arkive locally for debugging, run the following command:

```bash
arkiver start ./my-arkive --rpc-url "ethereum=https://mainnet.infura.io/v3/<YOUR_INFURA_PROJECT_ID>"
```

:::tip
You can optionally set your rpc urls as environment variables and omit the `--rpc-url` flag. For example, you can set the `ETHEREUM_RPC_URL` environment variable to your Ethereum RPC URL.
:::

This example Arkive queries the Ethereum blockchain for ERC20 transfers on the USDC contract, processes them and saves the data to an in-memory database. You can view the data by visiting the GraphQL playground at http://localhost:4000/graphql.

## Deploy your Arkive

To deploy your Arkive to the Arkiver, make sure you have an account and have logged in using the `arkiver login` command. Then run the following command:

```bash
arkiver deploy ./my-arkive
```

This will deploy your Arkive to the Arkiver and you can view it at https://arkiver.robolabs.biz/my-arkives/.

## Next steps

Now that you have created your first Arkive, you can learn more about the [manifest file](/docs/reference/manifest) and [handler functions](/docs/reference/handler-functions) to add more data sources and handler functions to your Arkive.
