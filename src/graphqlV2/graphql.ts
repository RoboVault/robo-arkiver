import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLFieldResolver,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from 'npm:graphql'
import {
  CollectionFactory,
  Scalar,
  ScalarWithRef,
  SchemaDefinition,
} from './collection.ts'

export class ArkiveSchemaComposer {
  #types: Record<string, GraphQLObjectType> = {}

  constructor() {}

  addCollection<TSchema extends SchemaDefinition>(
    collection: CollectionFactory<TSchema, string>,
  ) {
    const schema = {
      ...collection._schema,
      _id: collection._schema._id ?? 'objectId',
    }
    const fields = this.#buildFields(collection._name, schema)
    const type = new GraphQLObjectType({
      name: collection._name,
      fields,
    })
    this.#types[collection._name] = type
    return type
  }

  #buildFields(
    parentName: string,
    schema: SchemaDefinition,
  ) {
    const fields: Record<
      string,
      // deno-lint-ignore no-explicit-any
      GraphQLFieldConfig<any, any, any>
    > = {}

    for (const [key, value] of Object.entries(schema)) {
      if (key === '_id') {
        fields[key] = {
          type: GraphQLID,
        }
        continue
      }

      let innerValue: ScalarWithRef | SchemaDefinition
      let type: GraphQLScalarType | GraphQLObjectType
      let resolver: GraphQLFieldResolver<unknown, unknown> | undefined
      const isArray = Array.isArray(value)

      if (isArray) {
        innerValue = value[0]
      } else {
        innerValue = value
      }

      if (typeof innerValue === 'string') { // scalar
        type = mapScalarToGraphQLType(innerValue)
      } else if (typeof innerValue === 'function') { // nested collection
        const existing = this.#types[innerValue._schema._name]
        if (existing) {
          type = existing
        } else {
          type = this.addCollection(innerValue)
          resolver = (parent, args, context, info) => {} // @hazelnutcloud: implement resolver for nested collection using dataloader
        }
      } else { // nested object field
        const name = `${parentName}_${key}`
        const fields = this.#buildFields(
          name,
          innerValue as SchemaDefinition,
        )
        type = new GraphQLObjectType({
          name,
          fields,
        })
      }

      if (isArray) {
        fields[key] = {
          type: new GraphQLList(type),
        }
      } else {
        fields[key] = {
          type,
        }
      }

      if (resolver) {
        fields[key].resolve = resolver
      }
    }

    return fields
  }

  #buildQueryFieldsFromOuterTypes() {
    const fields: Record<
      string,
      // deno-lint-ignore no-explicit-any
      GraphQLFieldConfig<any, any, any>
    > = {}

    for (const [key, value] of Object.entries(this.#types)) {
      fields[key] = {
        type: value,
        args: {}, // @hazelnutcloud: implement args
        resolve: (parent, args, context, info) => {}, // @hazelnutcloud: implement resolver for query
      }
      fields[`${key}s`] = {
        type: new GraphQLList(value),
        args: {}, // @hazelnutcloud: implement args
        resolve: (parent, args, context, info) => {}, // @hazelnutcloud: implement resolver for query
      }
    }

    return fields
  }

  buildSchema() {
    const fields = this.#buildQueryFieldsFromOuterTypes()
    console.log('fields', fields)
    const queryObjectType = new GraphQLObjectType({
      name: 'Query',
      fields,
    })

    const schema = new GraphQLSchema({
      query: queryObjectType,
    })

    return schema
  }
}

export const mapScalarToGraphQLType = (scalar: Scalar) => {
  switch (scalar) {
    case 'string':
      return GraphQLString
    case 'int':
      return GraphQLInt
    case 'float':
      return GraphQLFloat
    case 'boolean':
      return GraphQLBoolean
    case 'bigint':
      return GraphQLString
    case 'objectId':
      return GraphQLString
    default:
      throw new Error(`Unknown scalar type: ${scalar}`)
  }
}
