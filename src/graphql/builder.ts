import { composeMongoose, mongoose, schemaComposer } from "../deps.ts";

export const buildSchemaFromEntities = (
  // deno-lint-ignore no-explicit-any
  entities: { model: mongoose.Model<any>; list: boolean }[],
) => {
  for (const { model, list } of entities) {
    schemaComposer.delete(model.modelName);
    // deno-lint-ignore no-explicit-any
    const ModelTC = composeMongoose<any>(model);

    schemaComposer.Query.addFields({
      [model.modelName]: ModelTC.mongooseResolvers.findOne({ lean: true }),
    });
    if (list) {
      schemaComposer.Query.addFields({
        [`${model.modelName}s`]: ModelTC.mongooseResolvers.findMany({
          lean: true,
        }),
      });
    }
  }

  const schema = schemaComposer.buildSchema();

  return schema;
};
