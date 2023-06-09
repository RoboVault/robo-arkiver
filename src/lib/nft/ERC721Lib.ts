import {
	ArkiveLib
} from '../ArkiveLib.ts'
import { ERC721 } from './erc721.ts'
import { ERC721Transfer, ERC721Balance, ERC721Token, ERC721Set } from './entities.ts'
import { onTransferFactory } from './handler.ts'


export type ERC721Opts = {
  contract: Record<string, bigint>,
  async: Boolean
}

export class ERC721Lib extends ArkiveLib {

  public static create(opts: ERC721Opts): ArkiveLib{
    let lib: ERC721Lib = new ERC721Lib()
    lib.sources = [{abi: ERC721, contract: opts.contract, handlers: { 'Transfer': onTransferFactory(opts.async) }}]
    lib.entities = [ERC721Transfer, ERC721Set, ERC721Balance, ERC721Token]
    lib.blockHandler = {}
    return lib
  }
}