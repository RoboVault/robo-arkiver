# Event Wildcard Arkive
This Arkive demonstrates adding a wildcard source to the manifest like this:
```
manifest
  .addChain('avalanche', { blockRange: BLOCK_RANGE })
  .addContract('ERC20', erc20)
  .addSources({ '*': START_BLOCK })
  .addEventHandlers({ 'Transfer': transferHandler })
```

In this example we are attaching to the Transfer event on all contracts. This means any contract matching the erc20 ABI will trigger the `Transfer` handler when the `Transfer` event is emitted.

The event data is parsed into a human readable format and logged to the console.
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

