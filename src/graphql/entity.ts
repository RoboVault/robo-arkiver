import { mongoose } from "../deps.ts";

export function createEntity<
  TEnforcedDocType = unknown,
>(
  name: string,
  schemaDefinition: mongoose.SchemaDefinition<
    mongoose.SchemaDefinitionType<TEnforcedDocType>
  >,
) {
  const schema = new mongoose.Schema<TEnforcedDocType>(schemaDefinition);
  const model = mongoose.model<TEnforcedDocType>(name, schema, undefined, {
    overwriteModels: true,
  });

  return model;
}
