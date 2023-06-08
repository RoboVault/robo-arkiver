import {
	IArkiveLib
} from '../IArkiveLib.ts'
import { AAVEIntervalData  } from './entities/aaveintervaldata.ts'
import { Pool } from './entities/pool.ts'
import { Token } from './entities/token.ts'
import { blockHandlerFactory } from './handlers/intervaldata.ts'


export type AaveOpts = {
  secondsInterval: number
  startBlockHeight: bigint
  blockInterval: bigint
}

export class AaveLib extends IArkiveLib {

  public static create(opts: AaveOpts): IArkiveLib{
    let lib: AaveLib = new AaveLib()
    lib.sources = {}
    lib.entities = [AAVEIntervalData, Pool, Token]
    lib.eventHandlers = {}
    lib.blockHandler = { blockInterval: opts.blockInterval, startBlockHeight: opts.startBlockHeight, handler: blockHandlerFactory(opts.secondsInterval) }
    return lib
  }
}