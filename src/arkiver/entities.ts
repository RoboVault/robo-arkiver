import { createEntity } from "../graphql/entity.ts";

interface IArkiverMetadata {
  processedBlockHeight: number;
  chain: string;
}

export const ArkiverMetadata = createEntity<IArkiverMetadata>(
  "ArkiverMetadata",
  { processedBlockHeight: Number, chain: String },
);
