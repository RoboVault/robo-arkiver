import { mongoose } from "../deps.ts";

interface IArkiverMetadata {
  processedBlockHeight: number;
  chain: string;
  eventHandlerCalls: number;
  blockHandlerCalls: number;
}

const arkiverMetadataSchema = new mongoose.Schema<IArkiverMetadata>({
  processedBlockHeight: Number,
  chain: String,
  eventHandlerCalls: Number,
  blockHandlerCalls: Number,
});

export const ArkiverMetadata = mongoose.model<IArkiverMetadata>(
  "ArkiveMetadata",
  arkiverMetadataSchema,
  undefined,
  { overwriteModels: true },
);
