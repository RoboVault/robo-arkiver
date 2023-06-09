import {
	mongoose,
  Abi
} from '../deps.ts'

export abstract class ArkiveLib {
  public sources: [] //{source: {abi: Abi, contract: Record<string, bigint>, handler: any}
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