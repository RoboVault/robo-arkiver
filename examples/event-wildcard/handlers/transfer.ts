import { EventHandlerFor, formatUnits } from '../deps.ts'
import { ERC20_ABI } from '../abis/erc20.ts'

export const transferHandler: EventHandlerFor<typeof ERC20_ABI, 'Transfer'> =
  async (
    { event, client, store, logger },
  ) => {
    const { from, to, value } = event.args

    const address = event.address

    let decimals = 18
    try {
      decimals = await store.retrieve(
        `${address}:decimals`,
        async () =>
          await client.readContract({
            abi: ERC20_ABI,
            functionName: 'decimals',
            address,
          }),
      )
    } catch (e) {
      logger.error(e)
    }

    const parsedValue = parseFloat(formatUnits(value, decimals))

    logger.info(
      `Transfer of ${parsedValue} from ${from} to ${to} on ${address}`,
    )
  }
