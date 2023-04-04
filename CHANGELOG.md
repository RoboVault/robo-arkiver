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