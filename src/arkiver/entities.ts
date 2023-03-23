import { createEntity } from "../graphql/entity.ts";

interface IArkiverMetadata {
  processedBlockHeight: number;
  chain: string;
}

export const ArkiverMetadata = createEntity<IArkiverMetadata>(
  "ArkiveMetadata",
  { processedBlockHeight: Number, chain: String },
);
