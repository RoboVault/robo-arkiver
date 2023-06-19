import { ArkiveLib } from '../ArkiveLib.ts'
import { AaveIntervalData } from './entities/aaveintervaldata.ts'
import { LendingPool } from './entities/lendingpool.ts'
import { Erc20Token } from './entities/erc20token.ts'
import { blockHandlerFactory } from './handlers/intervaldata.ts'

export type AaveOpts = {
	secondsInterval: number
	startBlockHeight: bigint
	blockInterval: bigint
}

export class AaveLib extends ArkiveLib {
	public static create(opts: AaveOpts): ArkiveLib {
		let lib: AaveLib = new AaveLib()
		lib.sources = []
		lib.entities = [AaveIntervalData, LendingPool, Erc20Token]
		lib.blockHandler = {
			blockInterval: opts.blockInterval,
			startBlockHeight: opts.startBlockHeight,
			handler: blockHandlerFactory(opts.secondsInterval),
		}
		return lib
	}
}
