import { EventHandlerFor, formatUnits } from './deps.ts'
import erc20 from './erc20.ts'
import { Balance } from './entities.ts'

export const transferHandler: EventHandlerFor<typeof erc20, 'Transfer'> =
  async (
    { event, client, store, contract, logger },
  ) => {
    const { from, to, value } = event.args

    const address = event.address

    // store.retrieve() will return the value if it exists in the store, otherwise it will run the function and store the result
    const decimals = await store.retrieve(
      `${address}:decimals`,
      contract.read.decimals,
    )

    // reduce rpc calls in case you have multiple events in the same block
    const timestamp = await store.retrieve(
      `${event.blockHash}:timestamp`,
      async () => {
        const block = await client.getBlock({ blockHash: event.blockHash })
        return Number(block.timestamp)
      },
    )

    const parsedValue = parseFloat(formatUnits(value, decimals))

    const [senderBalance, receiverBalance] = await Promise.all([
      await store.retrieve(
        `${from}:${address}:balance`,
        async () => {
          const balance = await Balance
            .find({ account: from, token: address })
            .sort({ timestamp: -1 })
            .limit(1)
          return balance[0]?.amount ?? 0
        },
      ),
      await store.retrieve(
        `${to}:${address}:balance`,
        async () => {
          const balance = await Balance
            .find({ account: from, token: address })
            .sort({ timestamp: -1 })
            .limit(1)
          return balance[0]?.amount ?? 0
        },
      ),
    ])
    const senderNewBalance = senderBalance - parsedValue
    const receiverNewBalance = receiverBalance + parsedValue

    // save the new balances to the database
    Balance.create({
      account: from,
      amount: senderNewBalance,
      token: address,
      timestamp,
    })
    Balance.create({
      account: to,
      amount: receiverNewBalance,
      token: address,
      timestamp,
    })
    logger.info(
      `Transfer of ${parsedValue} from ${from} to ${to} on ${address}`,
    )
  }
