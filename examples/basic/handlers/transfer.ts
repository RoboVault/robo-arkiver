import { EventHandlerFor, formatUnits } from '../deps.ts'
import { ERC20_ABI } from '../abis/erc20.ts'
import { Balance } from '../collections/balance.ts'

export const onTransfer: EventHandlerFor<typeof ERC20_ABI, 'Transfer'> = async (
  { event, store, contract, logger, db },
) => {
  const { from, to, value } = event.args

  const balance = Balance(db)

  const address = event.address

  // store.retrieve() will return the value if it exists in the store, otherwise it will run the function and store the result
  const decimals = await store.retrieve(
    `${address}:decimals`,
    contract.read.decimals,
  )

  const parsedValue = parseFloat(formatUnits(value, decimals))

  await Promise.all([
    balance.updateOne(
      { token: address, account: from },
      { $inc: { balance: -parsedValue } },
      { upsert: true },
    ),
    balance.updateOne(
      { token: address, account: to },
      { $inc: { balance: parsedValue } },
      { upsert: true },
    ),
  ])

  logger.info(
    `Transfer of ${parsedValue} from ${from} to ${to} on ${address}`,
  )
}
