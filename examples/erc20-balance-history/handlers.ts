import { formatUnits } from 'npm:viem'
import { type EventHandlerFor } from 'https://deno.land/x/robo_arkiver@v0.4.15/mod.ts'
import erc20 from './erc20.ts'
import { Balance, BalanceHistory, Transfer } from './entities.ts'

// Alternatively, you can pull this from the chain
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const getBalance = async (user: string, token: string) => {
  const bal = await Balance.findOne({ user })
  if (bal) return bal
  return new Balance({ user, token, balance: 0 })
}

export const onTransfer: EventHandlerFor<typeof erc20, 'Transfer'> = async (
  { event, store, client },
) => {
  // Store the transfer event
  const { from, to, value } = event.args
  const address = event.address

  // Grab the decimals with viem
  // Use store to cache the value so it is only called once
  const decimals = await store.retrieve(`${address}:decimals`, async () => {
    return await client.readContract({
      abi: erc20,
      address,
      functionName: 'decimals',
    })
  })

  const block = Number(event.blockNumber)
  const record = new Transfer({
    token: address,
    hash: event.transactionHash,
    block,
    from,
    to,
    value: formatUnits(value, Number(decimals)),
  })
  record.save()

  const updateBalance = async (user: string, value: number) => {
    // ignore zero address
    if (user === ZERO_ADDRESS) {
      return
    }

    // grab the balance entry for the user
    const bal = await getBalance(user, address)

    // adjust the value
    bal.balance += value

    // Create a BalanceHistory entry to record
    // historic changes in the balance
    const entry = new BalanceHistory({
      token: address,
      block,
      user,
      balance: bal.balance,
    })

    // Save both the balance and the history entry
    return Promise.all([
      bal.save(),
      entry.save(),
    ])
  }

  // Update the balances for both the sender and the receiver
  // note: user await here to ensure the handler is synchonous
  // 		 so te balances are updated
  const amount = Number(formatUnits(value, Number(decimals)))
  await Promise.all([
    updateBalance(from, -amount),
    updateBalance(to, amount),
  ])
}
