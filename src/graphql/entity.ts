import { mongoose } from "../deps.ts";

export function createEntity<
  // deno-lint-ignore no-explicit-any
  TEnforcedDocType = any,
>(
  name: string,
  schemaDefinition: mongoose.SchemaDefinition<
    mongoose.SchemaDefinitionType<TEnforcedDocType>
  >,
) {
  const schema = new mongoose.Schema<TEnforcedDocType>(schemaDefinition);
  const model = mongoose.model<TEnforcedDocType>(name, schema);

  return model;
}
