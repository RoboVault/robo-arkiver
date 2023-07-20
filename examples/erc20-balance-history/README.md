# ERC20 Balance History
This Arkive keeps an accurate historical record of the balance of an account of a given ERC20 token. It uses the Balance entity as a mutable variable updates as events are handled and is used to keep track of an accounts balance as we sync eventually reflecting true onchain balance. BalanceHistory is an unchanging entity which stores balance over time and is indexed by the `block` field. 
### Dependencies
* Docker
* Historical RPC (Infura, Ankr, Alchemy, etc)

### Arkive Usage

First make sure scripts/.env is configured correctly with your RPC endpoint. In this example we are connecting the `mainnet` with the Ankr public ETH endpoint.
> RPC_URL=mainnet=https://rpc.ankr.com/eth

All available tasks can been seen with
> deno task

To start a new instance of the Arkive you can use `deno task` to run the `new` script with the following command
> deno task new

To reset the database and resync the Arkive run `reset` task
> deno task reset

### Using the GraphQL Explorer
If Arkiver is running there should now be webpage avaiable at http://0.0.0.0:4000/graphql

In the left side you can use the no-code explorer to pick and chose which Entities and what fields of the Entities you would like to look at. Here is an example query for this Arkive. This fetches the latest Balance and BalanceHistory entities.
```
query MyQuery {
  Balance(sort: _ID_DESC) {
    token
    user
    balance
  }
  BalanceHistory(sort: _ID_DESC) {
    token
    block
    user
    balance
  }
}
```


