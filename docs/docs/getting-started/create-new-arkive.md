---
sidebar_position: 2
---

# Create your first Arkive

An **Arkive** consists of **data sources** which you define and **handler
functions** that process the data coming from those sources. All your **data
sources** are defined and mapped to their respective **handler functions** in
the **`manifest.ts`** file and all your **handler functions** are written in
plain **TypeScript** files.

## Generate an Arkive using the CLI

To generate a new Arkive from the CLI, run the following command:

```bash
arkiver init my-arkive
cd my-arkive
```

This will generate an example Arkive in the `my-arkive` directory.

:::tip If you are using VSCode with the official Deno extension, make sure to
initialize the workspace by running the
`Deno: Initialize Workspace Configuration` command in the VSCode command palette
in the new directory to enable the Deno language server. :::

## Project Structure

After running the `init` command above, your project directory should look like
this:

```
my-arkive
├── abis
│   └── erc20.ts
├── entities
│   └── balance.ts
├── handlers
│   └── transferHandler.ts
├── manifest.ts
└── deps.ts
```

### Project structure rundown

- `/abis/` - Contains the ABI files for your contracts.
- `/entities/` - Contains your database entities.
- `/handlers/` - Contains your handler functions.
- `/manifest.ts` - Contains the configuration for your Arkive. This is where you
  define your data sources and map them to your handler functions. This is also
  where you add your database entities.
- `/deps.ts` - Contains the dependencies for your Arkive. This is where you
  import any third-party libraries and use them throughout your Arkive.

## Run your Arkive locally

To run your Arkive locally, run the following command:

```bash
arkiver start . \
	-c mongodb://localhost:27017 \
	--rpc-url ethereum=https://mainnet.infura.io/v3/<YOUR_INFURA_PROJECT_ID>
```

:::info You can easily
[spin up a MongoDB instance locally with docker](https://www.mongodb.com/docs/v6.0/tutorial/install-mongodb-community-with-docker/).
Or you can omit the `-c` flag and Arkiver will not connect to any MongoDB
instance. In this case, you are free to use any database you want in your
handler functions and Arkiver will not serve your data via GraphQL. :::

:::tip To add multiple chains, use multiple `--rpc-url` flags. For example, to
add Arbitrum:

```bash
arkiver start . \
	-c mongodb://localhost:27017 \
	--rpc-url ethereum=https://mainnet.infura.io/v3/<YOUR_INFURA_PROJECT_ID> \
	--rpc-url arbitrum=https://arb1.arbitrum.io/rpc
```

:::

## Deploy your Arkive

To deploy your Arkive to the Arkiver, make sure you have an account and have
logged in using the `arkiver login` command. Then run the following command:

```bash
arkiver deploy . my-first-arkive
```

This will deploy your Arkive to the Arkiver and you can view it at
https://arkiver.robolabs.biz/username/arkive-name.

## Next steps

Now that you have created your first Arkive, you can learn more about the
[manifest file](/docs/reference/manifest), the
[handler functions](/docs/reference/handler-functions), and the
[entities](/docs/reference/entities) to learn in-depth about how to configure
this Arkive to your needs.
