// deno-lint-ignore-file no-explicit-any
import { composeMongoose, mongoose, SchemaComposer } from '../deps.ts'

export const buildSchemaFromEntities = (
  schemaComposer: SchemaComposer,
  entities: { model: mongoose.Model<any>; list: boolean }[],
) => {
  for (const { model, list } of entities) {
    const getTC = (schemaComposer: any, model: any) => {
      try {
        return schemaComposer.getAnyTC(model.modelName)
      } catch (_e) {
        return composeMongoose<any>(model)
      }
    }

    const ModelTC = getTC(schemaComposer, model)
    const addRelation = (path: string, ref: string, isArray: boolean) => {
      const refModel = entities.find((e) => e.model.modelName === ref)
      if (refModel) {
        const RefTC = getTC(schemaComposer, refModel.model)
        const query = isArray ? 'dataLoaderMany' : 'dataLoader'
        const _id = isArray ? '_ids' : '_id'

        ModelTC.addRelation(path, {
          resolver: () => RefTC.mongooseResolvers[query]({ lean: true }),
          prepareArgs: {
            [_id]: (source: any) => source[path],
          },
          projection: { [path]: 1 },
        })
      }
    }

    model.schema.eachPath((path: string, type: any) => {
      if (path === '_id') {
        return
      }

      if (type.instance === 'Array' && type.caster.instance === 'ObjectId') {
        addRelation(path, type.caster.options.ref, true)
      }

      if (type.instance === 'ObjectId') {
        addRelation(path, type.options.ref, false)
      }
    })

    schemaComposer.Query.addFields({
      [model.modelName]: ModelTC.mongooseResolvers.findOne({ lean: true }),
    })
    if (list) {
      schemaComposer.Query.addFields({
        [`${model.modelName}s`]: ModelTC.mongooseResolvers.findMany({
          lean: true,
        }),
        [`${model.modelName}sCount`]: ModelTC.mongooseResolvers.count(),
      })
    }
  }

  return schemaComposer
}
