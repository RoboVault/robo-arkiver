import { ArkiverMetadata } from "../arkive-metadata.ts";
import { IndexedBlockHeightParams, StatusProvider } from "./interfaces.ts";

export class MongoStatusProvider implements StatusProvider {
  async getIndexedBlockHeight(
    params: IndexedBlockHeightParams,
  ): Promise<number> {
    const { chain } = params;

    const arkiverMetadata = await ArkiverMetadata.find({ chain }).sort({
      processedBlockHeight: -1,
    }).limit(1);

    return arkiverMetadata[0]?.processedBlockHeight || 0;
  }
}
