import { ArkiveLib } from '../ArkiveLib.ts'
import { Erc721 } from './Erc721.ts'
import {
  Erc721Balance,
  Erc721Set,
  Erc721Token,
  Erc721Transfer,
} from './entities.ts'
import { onTransferFactory } from './handler.ts'

export type Erc721Opts = {
  contract: Record<string, bigint>
  async: Boolean
}

export class Erc721Lib extends ArkiveLib {
  public static create(opts: ERC721Opts): ArkiveLib {
    let lib: Erc721Lib = new Erc721Lib()
    lib.sources = [{
      abi: Erc721,
      contract: opts.contract,
      handlers: { 'Transfer': onTransferFactory(opts.async) },
    }]
    lib.entities = [Erc721Transfer, Erc721Set, Erc721Balance, Erc721Token]
    lib.blockHandler = {}
    return lib
  }
}
