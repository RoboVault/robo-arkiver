import {
	IArkiveLib
} from '../IArkiveLib.ts'
import erc721 from './erc721.ts'
import { ERC721Transfer, ERC721Balance, ERC721Token } from './entities.ts'
import { onTransfer } from './handler.ts'


export type ERC721Opts = {
  contract: Record<string, bigint>
}

export class ERC721Lib extends IArkiveLib {

  public static create(opts: ERC721Opts): IArkiveLib{
    let lib: ERC721Lib = new ERC721Lib()
    lib.abi = erc721
    lib.sources = opts.contract
    lib.entities = [ERC721Transfer, ERC721Balance, ERC721Token]
    lib.eventHandlers = { 'Transfer': onTransfer }
    lib.blockHandler = {}
    return lib
  }
}