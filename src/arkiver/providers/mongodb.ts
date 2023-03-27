import { ArkiverMetadata } from "../arkive-metadata.ts";
import { IndexedBlockHeightParams, StatusProvider } from "./interfaces.ts";

export class MongoStatusProvider implements StatusProvider {
  async getIndexedBlockHeight(
    params: IndexedBlockHeightParams,
  ): Promise<number> {
    const { chain } = params;

    const arkiverMetadata = await ArkiverMetadata.findOne({ chain });

    return arkiverMetadata?.processedBlockHeight || 0;
  }
}
