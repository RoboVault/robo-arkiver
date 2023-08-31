import { Manifest } from './deps.ts'
import { ERC_20_ABI } from './abis/Erc20.ts'
import { Balance } from './collections/balance.ts'
import { onTransfer } from './handlers/transfer.ts'

export default new Manifest('simple')
  .addCollection(Balance)
  .addChain('mainnet', (chain) =>
    chain
      .setOptions({ blockRange: 500n, rpcUrl: 'https://rpc.ankr.com/eth' })
      .addContract({
        name: 'Erc20',
        abi: ERC_20_ABI,
        sources: { '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 16987011n },
        eventHandlers: { 'Transfer': onTransfer },
      }))
  .build()
