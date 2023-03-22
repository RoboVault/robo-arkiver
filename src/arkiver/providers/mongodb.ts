import { IndexedBlockHeightParams, StatusProvider } from "./interfaces.ts";

export class MongoStatusProvider implements StatusProvider {
  async getIndexedBlockHeight(
    _params: IndexedBlockHeightParams,
  ): Promise<number> {
    // TODO: Implement this
    return await Promise.resolve(0);
  }
}
