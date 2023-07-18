import { UNISWAP_V2_FACTORY } from '../abis/UniswapV2Factory.ts'
import { EventHandlerFor } from '../deps.ts'

export const onPairCreated: EventHandlerFor<
  typeof UNISWAP_V2_FACTORY,
  'PairCreated'
> = async ({ event, logger, spawnContract }) => {
  const { token0, token1, pair, allPairsLength } = event.args

  logger.info(`New pair created at ${pair} with tokens:
- ${token0}
- ${token1}
Total pairs: ${allPairsLength}`)

  await spawnContract({
    address: pair,
    name: 'UniswapV2Pair',
  })
}
