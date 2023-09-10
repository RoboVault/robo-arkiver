import { UNISWAP_V2_PAIR_ABI } from '../abis/uniswap-v2-pair.ts'
import { EventHandlerFor } from '../deps.ts'

export const onSwap: EventHandlerFor<typeof UNISWAP_V2_PAIR_ABI, 'Swap'> = (
  { event, logger },
) => {
  const { amount0In, amount0Out, amount1In, amount1Out, sender, to } =
    event.args

  logger.info(`New swap from ${event.address} at block ${event.blockNumber}:
		- Amount 0 in: ${amount0In}
		- Amount 0 out: ${amount0Out}
		- Amount 1 in: ${amount1In}
		- Amount 1 out: ${amount1Out}
		- Sender: ${sender}
		- To: ${to}`)
}
