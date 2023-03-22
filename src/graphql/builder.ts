import { composeMongoose, mongoose, schemaComposer } from "../deps.ts";

export const buildSchemaFromEntities = (
  entities: Record<string, mongoose.Schema>,
) => {
  for (const entityName in entities) {
    const Model = mongoose.model(entityName, entities[entityName]);
    // deno-lint-ignore no-explicit-any
    const ModelTC = composeMongoose<any>(Model);

    schemaComposer.Query.addFields({
      [entityName]: ModelTC.mongooseResolvers.findOne({ lean: true }),
      [`${entityName}s`]: ModelTC.mongooseResolvers.findMany({ lean: true }),
    });
  }

  const schema = schemaComposer.buildSchema();

  return schema;
};
