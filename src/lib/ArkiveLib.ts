import {
	mongoose,
  Abi
} from '../deps.ts'

export type SourceInfo = { abi: Abi, contract: Record<string, bigint>, handlers: any }

export abstract class ArkiveLib {
  public sources: SourceInfo[]
  public entities: mongoose.Model<any>[]
  public blockHandler: any

  public getDataSources() {
    return this.sources
  }

  public getEntities(): mongoose.Model<any>[]{
    return this.entities
  }

  public getBlockHandler(){
    return this.blockHandler
  }
}