import { Manifest } from './deps.ts'
import { UNISWAP_V2_PAIR_ABI } from './abis/uniswap-v2-pair.ts'
import { Price } from './collections/price.ts'
import { onSwap } from './handlers/swap.ts'

export default new Manifest('timeseries')
  .addCollection(Price)
  .addChain('mainnet', (chain) =>
    chain
      .setOptions({ rpcUrl: 'https://rpc.ankr.com/eth', blockRange: 500n })
      .addContract({
        name: 'UniswapV2Pair',
        abi: UNISWAP_V2_PAIR_ABI,
        sources: { '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc': 18046917n },
        eventHandlers: { Swap: onSwap },
      }))
  .build()
