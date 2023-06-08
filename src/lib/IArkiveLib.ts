import {
	mongoose,
  Abi
} from '../deps.ts'

export abstract class IArkiveLib {
  //public variable for datasource entities
  public sources: Record<string, bigint>
  public entities: mongoose.Model<any>[]
  public eventHandlers: any
  public blockHandler: any
  public abi: Abi

  public getDataSources() {
    return this.sources
  }

  public getEntities(): mongoose.Model<any>[]{
    return this.entities
  }

  public getEventHandlers(){
    return this.eventHandlers
  }

  public getBlockHandler(){
    return this.blockHandler
  }
}