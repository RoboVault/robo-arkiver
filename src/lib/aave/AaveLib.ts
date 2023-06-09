import {
	ArkiveLib
} from '../ArkiveLib.ts'
import { AAVEIntervalData  } from './entities/aaveintervaldata.ts'
import { LendingPool } from './entities/lendingpool.ts'
import { ERC20Token } from './entities/erc20token.ts'
import { blockHandlerFactory } from './handlers/intervaldata.ts'


export type AaveOpts = {
  secondsInterval: number
  startBlockHeight: bigint
  blockInterval: bigint
}

export class AaveLib extends ArkiveLib {

  public static create(opts: AaveOpts): ArkiveLib{
    let lib: AaveLib = new AaveLib()
    lib.sources = []
    lib.entities = [AAVEIntervalData, LendingPool, ERC20Token]
    lib.blockHandler = { blockInterval: opts.blockInterval, startBlockHeight: opts.startBlockHeight, handler: blockHandlerFactory(opts.secondsInterval) }
    return lib
  }
}