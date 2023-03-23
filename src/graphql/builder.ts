import { composeMongoose, mongoose, schemaComposer } from "../deps.ts";

export const buildSchemaFromEntities = (
  // deno-lint-ignore no-explicit-any
  entities: Record<string, mongoose.Model<any>>,
) => {
  for (const entityName in entities) {
    // deno-lint-ignore no-explicit-any
    const ModelTC = composeMongoose<any>(entities[entityName]);

    schemaComposer.Query.addFields({
      [entityName]: ModelTC.mongooseResolvers.findOne({ lean: true }),
      [`${entityName}List`]: ModelTC.mongooseResolvers.findMany({ lean: true }),
    });
  }

  const schema = schemaComposer.buildSchema();

  return schema;
};
