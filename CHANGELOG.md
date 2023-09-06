#v0.4.22
- Fix bug where decoding event log from wildcard sources would sometimes fail

# v0.4.21
- Fix event type in event handler contexts

# v0.4.20
- Add two new utility functions:
  - `getClosestTimestamp`
  - `getTimestampFromBlockNumber`
- Update manifest validator to not use arktype
- change --public options to --private in `arkiver deploy`
- Updated examples 

# v0.4.19
- Adds factory sources. added an example factory-source to showcase this. API looks like:
```typescript
new Manifest('factory-source')
  .addChain('ethereum', (ethereum) =>
    ethereum
      .setOptions({
        blockRange: 100n,
      })
      .addContract({
        abi: UNISWAP_V2_FACTORY,
        name: 'UniswapV2Factory',
        sources: {
          '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f': 17736650n,
        },
      })
      .addContract({
        abi: UNISWAP_V2_PAIR,
        name: 'UniswapV2Pair',
        factorySources: {
          UniswapV2Factory: {
            PairCreated: 'pair',
          },
        },
        eventHandlers: {
          Swap: onSwap,
        },
      }))
  .build()
```
- remove deprecated overloads to `addContract`. this wont break compatibility because the function implementation stays the same
- move lib exports from `mod.ts` to a new top-level `libs.ts` file
- add polygonZkEvm to supportedChains
- add top-level `utils.ts` file which export some useful utility function

# v0.4.18
- fix: fix version of arktype to fix export error

# v0.4.17
- fix: bug in schema composer where it was not properly handling entities

# v0.4.16
- feat: enhance `arkiver list` command, see `arkiver list --help`
- feat: added 3 new commands to the CLI:
  - `arkiver keygen` to generate a new API key
  - `arkiver keyrm` to remove an API key
  - `arkiver keyls` to list all API keys
- feat: adjusted `arkiver init` command
- feat: Add --gql-only option to arkiver start command to start only the graphQL server
- feat: Change EventHandler and BlockHandler return type to be Promise<void> | void
- fix: bug where deploying while logged out causes issues when trying to login again in the same command

# v0.4.15
- feat: populate relational entities on graphql endpoint
- feat: add overload to `manifest.addChain` and `chain.addContract` functions to pass in a callback function that takes in a DataSourceBuilder and ContractBuilder instance respectively
- feat: remove svn as a dependancy to run `arkiver init` command
- change: deprecate `manifest.chain` for `manifest.addChain`
- change: deprecate `manifest.contract` for `manifest.addContract`
- change: `transactionIndex` and `logIndex` field in event is now number type to align with viem's return types
- fix: missing event handler types due to updates to `viem` package

# v0.4.14
- fix: reimport from npm: directive

# v0.4.13
- fix: import chains from esm.sh instead of using npm: directive

# v0.4.12
- fix: version number
- feat: validate manifest when building and deploying

# v0.4.11
- fix: show error message when `arkive deploy` fails
- feat: add maximum retry attempts to handler function. default of 5 retries
- feat: add fuji to chains

# v0.4.10
- fix: emit event when arkiver is synced
- fix: set maxQueueSize to 3

# v0.4.9
- chore: add environment flag to deploy command

# v0.4.8
- fix: small bug in `arkiver deploy` where it was incorrectly uploading the name string as the arkiver

# v0.4.7
- feat: add overload to .contract() method of the manifest builder to allow for passing in a name to identify the contract instead of the digest of the contract ABI
- feat: enhanced logging features
- feat: removed logger export
- chore: update `arkiver deploy` command to include serialized manifest
- chore: add entity name field to manifest
- chore: add block handler name field to manifest
- chore: use digest instead of uuid for contract id

# v0.4.6
- fix: add minor version to data source
# v0.4.5

- feat: add localhost to supported chains
- feat: add arkive id and arkive version to arkive metadata
- fix: fix bug regarding retry fetch behavior
- chore: update `arkiver list` command

# v0.4.4

- feat: enhanced `arkiver list` command
- feat: add dev mode

# v0.4.3

- feat: added sepolia testnet

# v0.4.2

- fix: fixed a bug with the indexing logic
- chore: slight adustment to the console logger
- feat: added a log to indicate when the arkiver starts indexing live

# v0.4.1

- feat: change `arkiver remove` command to use the arkive name specified in the
  manifest instead of passing an the deployed arkive id.
- feat: added `arkiver list` command to list all your arkives
- fix: fixed a bug where block handlers won't run when you start indexing live
  data

# v0.4.0

- feat: Pass in viem contract instance to event handlers. You no longer need to
  call `getContract` in your event handlers.
- feat: Loggers are now passed to event handlers instead of being global.
- feat: You can now configure custom loggers by calling `log.setup` before
  running the Arkiver instance.
- feat: You can now configure the log level for the default console logger by
  passing in the `--log-level` flag to the `arkiver start` command.
- feat: Enhanced the `arkiver init` command. You can now choose which template
  you want to initialize your arkive with. Templates are stored in the
  `examples` directory.
- feat: Enhanced logging
- fix: several bugfixes related to wildcard event handlers

# v0.3.7

- fix: Fixed a bug where arkive would crash if you used event wildcards
- fix: Fixed a bug where entities from other arkvies would show up in other
  arkives graphql schema
- fix: Fixed a bug where reading source.options would return undefined
- feat: Updated init template to show clearer example
- feat: Added `--no-db` flag to `arkiver start` command to disable connecting to
  MongoDB and serving data via GraphQL
- feat: Check for new version of Arkiver CLI on every command

# v0.3.6

- Added more chains: Optimism, Polygon Mumbai, Polygon, Fantom, and Binance
  Smart Chain

# v0.3.5

- feat: The name passed to the `Manifest` constructor now typechecks
- feat: Added `arkiver upgrade` command to automatically update to the latest
  version
- feat: Various improvements to the Manifest Builder API. More typesafety and
  clearer intention:
  - Deprecating `addSource` and `addEventHandler`. Use `addSources` and
    `addEventHandlers` instead. This enables more checks at the type-level that
    weren't possible before.
  - Deprecating `addChain` and `addContract`, renamed to `chain` and `contract`,
    respectively. This is to better communicate the fact that those two methods
    instantiate a new chain and contract builder, instead of building upon the
    manifest builder itself, reducing the possibility of confusion when trying
    to add more chains and contracts.
- fix: Properly use passed in RPC URL in `addChain` method

# v0.3.4

- Signing up now requires a username
- Fixed a bug where the `arkiver start` command would not start the GraphQL
  server if no `-c` flag was passed
- Add options parameter to `Manifest`'s `addChain` method. This allows you to
  specify the chain's querying blockrange and the chain's RPC URL.
- Add rpcUrl field to `ChainOptions`. You can now omit passing in `--rpc-url` to
  the `arkiver start` command and instead pass in the RPC URL in the `addChain`
  method. If no RPC URL is passed in, the default public RPC URL for the chain
  will be used.
- Small enhancements to CLI error messages

# v0.3.3

- Re-add automatic mongodb spin up on `arkiver start` command

# v0.3.2

- Fix a bug with passing undefined to the Manifest constructor

# v0.3.1

- Allow empty name to be passed to the Manifest constructor to allow for
  backwards compatibility.

# v0.3.0

## Minor

- The Manifest class now requires a name to be passed in the constructor. This
  name will be used to identify the Arkive when deploying.
- The Arkive name is no longer passed as a command line argument to the
  `arkiver deploy` command. Instead, it is passed in the manifest constructor.

## Bug Fixes

- Fixed a bug in the `buildSchemaFromEntities` function

# v0.2.0

## Patches

- Fixing a bug where supported chains were not set correctly
- Exported `supportedChains` object
- Adding abi in the manifest builder now typechecks the abi to make sure it's
  const

## Minor

- Added `--no-gql` flag to `arkiver start` command to disable GraphQL server
- Update `--rpc-url` flag to be collect instead of variadic. i.e.
  `--rpc-url ethereum=https://mainnet.infura.io/v3/<YOUR_INFURA_PROJECT_ID> --rpc-url arbitrum=https://arb1.arbitrum.io/rpc`
  instead of
  `--rpc-url ethereum=https://mainnet.infura.io/v3/<YOUR_INFURA_PROJECT_ID> arbitrum=https://arb1.arbitrum.io/rpc`
- The `--rpc-url` flag is now required
- Omitting the `-c` flag in `arkiver start` will not connect to any MongoDB
  instance. In this case, you are free to use any database you want in your
  handler functions and Arkiver will not serve your data via GraphQL.
- Added required username while signing up
