import { UNISWAP_V2_FACTORY } from './abis/UniswapV2Factory.ts'
import { UNISWAP_V2_PAIR } from './abis/UniswapV2Pair.ts'
import { Manifest } from './deps.ts'
import { onPairCreated } from './handlers/pairCreated.ts'
import { onSwap } from './handlers/swap.ts'

export default new Manifest('spawn-sources')
  .addChain('ethereum', (chain) => {
    chain
      .setOptions({
        blockRange: 799n,
        rpcUrl:
          'https://nd-266-887-751.p2pify.com/eff2e208e3d6b166bc048d9b531350be',
      })
      .addContract({
        abi: UNISWAP_V2_FACTORY,
        name: 'UniswapV2Factory',
        eventHandlers: {
          PairCreated: onPairCreated,
        },
        sources: {
          '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f': 17598521n,
        },
      })
      .addContract({
        abi: UNISWAP_V2_PAIR,
        name: 'UniswapV2Pair',
        eventHandlers: {
          Swap: onSwap,
        },
      })
  })
  .build()
