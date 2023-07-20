import { UNISWAP_V2_FACTORY } from './abis/UniswapV2Factory.ts'
import { UNISWAP_V2_PAIR } from './abis/UniswapV2Pair.ts'
import { Manifest } from './deps.ts'
import { onSwap } from './handlers/swap.ts'

const manifest = new Manifest('factory-source')
  .addChain('ethereum', (ethereum) =>
    ethereum
      .addContract({
        abi: UNISWAP_V2_FACTORY,
        name: 'UniswapV2Factory',
        sources: {
          '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f': 17598521n,
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

export default manifest

console.log(manifest.dataSources?.ethereum?.contracts?.[1].factorySources)
