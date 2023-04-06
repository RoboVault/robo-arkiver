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
