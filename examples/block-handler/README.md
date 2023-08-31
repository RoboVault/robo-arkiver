# ERC20 Balance History
This Arkive keeps an accurate historical record of the sharePrice of a given set of YearnV2 Abi Vaults. sharePrice increases as profits are distributed to the vaults, but may also decrease if loss is incurred. It may be valuable to track this information in case of incidents or in order to optimize the vaults for instance. 
### Dependencies
* Docker
* Full Archive RPC (Infura, Ankr, Alchemy, etc)

### Arkive Usage

First make sure .env is configured correctly with your RPC endpoint. In this example we are connecting the `mainnet` with the Ankr public ETH endpoint.
> MAINNET_RPC_URL=https://rpc.ankr.com/eth

All available tasks can been seen with
> deno task

To start a new instance of the Arkive you can use `deno task` to run the `new` script with the following command
> deno task new

To reset the database and resync the Arkive run `reset` task
> deno task reset

### Using the GraphQL Explorer
If Arkiver is running there should now be webpage avaiable at http://0.0.0.0:4000/graphql

In the left side you can use the no-code explorer to pick and choose which Entities and what fields of the Entities you would like to look at. Here is an example query for this Arkive. This fetches the latest VaultSnapshot entity.
```
query MyQuery {
  VaultSnapshot(sort: _ID_DESC) {
    vault
    name
    symbol
    block
    timestamp
    sharePrice
  }
}
```


