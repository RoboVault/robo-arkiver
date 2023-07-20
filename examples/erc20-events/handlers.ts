import { formatUnits } from 'npm:viem'
import { type EventHandlerFor } from 'https://deno.land/x/robo_arkiver@v0.4.17/mod.ts'
import erc20 from './erc20.ts'
import { Approval, Transfer } from './entities.ts'

// Alternatively, you can pull this from the chain
const TOKEN_DECIMALS = 18

// deno-lint-ignore require-await
export const onTransfer: EventHandlerFor<typeof erc20, 'Transfer'> = async (
  { event, logger },
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
  const parsedValue = parseFloat(formatUnits(value, TOKEN_DECIMALS))
  logger.info(`Transfer of ${parsedValue} from ${from} to ${to} on ${event.address}`)
}

// deno-lint-ignore require-await
export const onApproval: EventHandlerFor<typeof erc20, 'Approval'> = async (
  { event, logger },
) => {
  const { owner, spender, value } = event.args
  const block = Number(event.blockNumber)
  const parsedValue = parseFloat(formatUnits(value, TOKEN_DECIMALS))
  const record = new Approval({
    hash: event.transactionHash,
    block,
    owner,
    spender,
    value: parsedValue,
  })
  record.save()
  
  logger.info(`Approval of ${parsedValue} from ${owner} to ${spender} on ${event.address}`)
}
