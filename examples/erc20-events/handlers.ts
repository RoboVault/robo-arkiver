import { formatUnits } from 'npm:viem'
import { type EventHandlerFor } from 'https://deno.land/x/robo_arkiver@v0.4.15/mod.ts'
import erc20 from './erc20.ts'
import { Approval, Transfer } from './entities.ts'

// Alternatively, you can pull this from the chain
const TOKEN_DECIMALS = 18

// deno-lint-ignore require-await
export const onTransfer: EventHandlerFor<typeof erc20, 'Transfer'> = async (
  { event },
) => {
  const { from, to, value } = event.args
  const block = Number(event.blockNumber)
  const record = new Transfer({
    hash: event.transactionHash,
    block,
    from,
    to,
    value: formatUnits(value, TOKEN_DECIMALS),
  })
  record.save()
}

// deno-lint-ignore require-await
export const onApproval: EventHandlerFor<typeof erc20, 'Approval'> = async (
  { event },
) => {
  const { owner, spender, value } = event.args
  const block = Number(event.blockNumber)
  const record = new Approval({
    hash: event.transactionHash,
    block,
    owner,
    spender,
    value: formatUnits(value, TOKEN_DECIMALS),
  })
  record.save()
}
