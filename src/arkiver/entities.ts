import { mongoose } from "../deps.ts";

interface IArkiverMetadata {
  processedBlockHeight: number;
  chain: string;
}

const arkiverMetadataSchema = new mongoose.Schema<IArkiverMetadata>({
  processedBlockHeight: Number,
  chain: String,
});

export const ArkiverMetadata = mongoose.model<IArkiverMetadata>(
  "ArkiveMetadata",
  arkiverMetadataSchema,
  undefined,
  { overwriteModels: true },
);
