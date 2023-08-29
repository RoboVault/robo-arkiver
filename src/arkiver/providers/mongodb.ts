import { Database } from '../../deps.ts'
import { ArkiveMetadata } from '../arkive-metadata.ts'
import { SpawnedSource } from '../spawned-source.ts'
import {
  AddSpawnedSourceParams,
  IndexedBlockHeightParams,
  SaveArkiveMetadataParams,
  StatusProvider,
} from './interfaces.ts'

export class MongoStatusProvider implements StatusProvider {
  #arkiveMetadataCollection: ReturnType<typeof ArkiveMetadata>
  #spawnedSourceCollection: ReturnType<typeof SpawnedSource>

  constructor(db: Database) {
    this.#arkiveMetadataCollection = ArkiveMetadata(db)
    this.#spawnedSourceCollection = SpawnedSource(db)
  }

  async getIndexedBlockHeight(
    params: IndexedBlockHeightParams,
  ): Promise<number> {
    const { chain } = params

    const arkiveMetadata = await this.#arkiveMetadataCollection.find({ chain })
      .sort({
        processedBlockHeight: -1,
      }).limit(1).toArray()

    return arkiveMetadata[0]?.processedBlockHeight || 0
  }

  async saveArkiveMetadata(
    params: SaveArkiveMetadataParams,
  ): Promise<void> {
    await this.#arkiveMetadataCollection.updateOne({
      _id: `${params.chain}:${params.blockNumber}`,
    }, {
      $setOnInsert: {
        processedBlockHeight: Number(params.blockNumber),
        chain: params.chain,
        arkiveId: params.arkiveId,
        arkiveMajorVersion: params.arkiveMajorVersion,
        arkiveMinorVersion: params.arkiveMinorVersion,
      },
      $inc: {
        [params.type === 'block' ? 'blockHandlerCalls' : 'eventHandlerCalls']:
          1,
      },
      $push: {
        errors: params.error,
      },
    }, {
      upsert: true,
    })
  }

  async addSpawnedSource(params: AddSpawnedSourceParams): Promise<void> {
    await this.#spawnedSourceCollection.insertOne(params)
  }
}
