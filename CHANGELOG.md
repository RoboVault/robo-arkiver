# v0.3.4
- Signing up now requires a username
- Fixed a bug where the `arkiver start` command would not start the GraphQL server if no `-c` flag was passed

# v0.3.3
- Re-add automatic mongodb spin up on `arkiver start` command

# v0.3.2
- Fix a bug with passing undefined to the Manifest constructor

# v0.3.1
- Allow empty name to be passed to the Manifest constructor to allow for backwards compatibility.

# v0.3.0
## Minor
- The Manifest class now requires a name to be passed in the constructor. This name will be used to identify the Arkive when deploying.
- The Arkive name is no longer passed as a command line argument to the `arkiver deploy` command. Instead, it is passed in the manifest constructor.
  
## Bug Fixes
- Fixed a bug in the `buildSchemaFromEntities` function

# v0.2.0

## Patches
- Fixing a bug where supported chains were not set correctly
- Exported `supportedChains` object
- Adding abi in the manifest builder now typechecks the abi to make sure it's const

## Minor
- Added `--no-gql` flag to `arkiver start` command to disable GraphQL server
- Update `--rpc-url` flag to be collect instead of variadic. i.e. `--rpc-url ethereum=https://mainnet.infura.io/v3/<YOUR_INFURA_PROJECT_ID> --rpc-url arbitrum=https://arb1.arbitrum.io/rpc` instead of `--rpc-url ethereum=https://mainnet.infura.io/v3/<YOUR_INFURA_PROJECT_ID> arbitrum=https://arb1.arbitrum.io/rpc`
- The `--rpc-url` flag is now required
- Omitting the `-c` flag in `arkiver start` will not connect to any MongoDB instance. In this case, you are free to use any database you want in your handler functions and Arkiver will not serve your data via GraphQL.
- Added required username while signing up