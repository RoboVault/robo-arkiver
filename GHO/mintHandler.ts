import { EventHandlerFor, formatUnits } from './deps.ts'
import aToken from './ABI/aToken.ts'
import { AccountCollateral } from './entities.ts'

export const mintHandler: EventHandlerFor<typeof aToken, 'Mint'> =
	async (
		{ event, client, store, contract },
	) => {
		const { caller, onBehalfOf, value, balanceIncrease, index } = event.args

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

		const [minterBalance] = await Promise.all([
			await store.retrieve(
				`${onBehalfOf}:${address}:collateral`,
				async () => {
					const collateral = await AccountCollateral
						.find({ account: onBehalfOf, token: address })
						.sort({ timestamp: -1 })
						.limit(1)
					return collateral[0]?.collateralAmountTotal ?? parseFloat(formatUnits(await contract.read.balanceOf([onBehalfOf]), decimals))
				},
			)
		])

		const minterNewBalance = minterBalance + parsedValue

		// save the new balances to the database
		AccountCollateral.create({
      account: onBehalfOf,
      collateralAmountTotal: minterNewBalance,
      token: address,
      timestamp,
		})

    store.set(`${onBehalfOf}:${address}:collateral`, minterNewBalance)
	}
