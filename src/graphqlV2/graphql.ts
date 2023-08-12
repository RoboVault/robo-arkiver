import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLFieldConfig,
  GraphQLFieldResolver,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from 'npm:graphql'
import { default as DataLoader } from 'npm:dataloader'
import {
  CollectionFactory,
  Document,
  Scalar,
  ScalarWithRef,
  SchemaDefinition,
} from './collection.ts'
import {
  Database,
  ObjectId,
} from 'https://raw.githubusercontent.com/Robo-Labs/mongo/main/mod.ts'

export class ArkiveSchemaComposer {
  #collections = new Map<
    string,
    {
      type: GraphQLObjectType
      collection: CollectionFactory<{ _id: Scalar }, string>
    }
  >()
  #loadedCollections = new Set<string>() // names of collections that are nested therefore needing a dataloader

  constructor() {}

  addCollection<TSchema extends SchemaDefinition>(
    collection: CollectionFactory<TSchema, string>,
  ) {
    const existing = this.#collections.get(collection._name)
    if (existing) return existing.type

    collection._schema = {
      ...collection._schema,
      _id: collection._schema._id ?? 'objectId',
    }

    const fields = this.#buildFields(collection._name, collection._schema)

    const type = new GraphQLObjectType({
      name: collection._name,
      fields,
    })

    this.#collections.set(collection._name, {
      collection: collection as CollectionFactory<{ _id: Scalar }, string>,
      type,
    })

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
      let resolver:
        | GraphQLFieldResolver<
          Document<typeof schema>,
          {
            loaders: Map<string, DataLoader<unknown, unknown>>
          }
        >
        | undefined
      const isArray = Array.isArray(value)

      if (isArray) {
        innerValue = value[0]
      } else {
        innerValue = value
      }

      if (typeof innerValue === 'string') {
        // scalar
        type = mapScalarToGraphQLType(innerValue)
      } else if (typeof innerValue === 'function') {
        // nested collection
        type = this.addCollection(innerValue)
        const name = innerValue._name
        resolver = (parent, _args, { loaders }) => {
          const loader = loaders.get(name)
          if (!loader) throw new GraphQLError(`no loader for ${name}`)

          return isArray
            ? loader.loadMany(parent[key])
            : loader.load(parent[key])
        }
        this.#loadedCollections.add(innerValue._name)
      } else {
        // nested object field
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

  #buildQueryFields() {
    const fields: Record<
      string,
      // deno-lint-ignore no-explicit-any
      GraphQLFieldConfig<any, { db: Database }, any>
    > = {}

    for (const [key, { type, collection }] of this.#collections.entries()) {
      fields[key] = {
        type,
        args: {
          _id: {
            type: new GraphQLNonNull(
              mapScalarToGraphQLType(collection._schema._id),
            ),
          },
        },
        resolve: (_, { _id }, { db }) => {
          if (collection._schema._id === 'objectId') {
            _id = new ObjectId(_id)
          }
          return collection(db).findOne({ _id })
        },
      }
      fields[`${key}s`] = {
        type: new GraphQLList(type),
        args: {}, // @hazelnutcloud: implement args
        resolve: (_, _args, { db }) => {
          return collection(db).find().toArray()
        }, // @hazelnutcloud: implement resolver for query
      }
    }

    return fields
  }

  buildSchema() {
    const fields = this.#buildQueryFields()

    const queryObjectType = new GraphQLObjectType({
      name: 'Query',
      fields,
    })

    const schema = new GraphQLSchema({
      query: queryObjectType,
    })

    const createLoaders = (db: Database) => {
      const loaders = new Map<string, DataLoader<unknown, unknown>>()

      for (const [key, { collection }] of this.#collections.entries()) {
        if (!this.#loadedCollections.has(key)) continue // skip collections that are not nested

        loaders.set(
          key,
          new DataLoader(async (ids: readonly unknown[]) => {
            const docs = await collection(db).find({
              // deno-lint-ignore no-explicit-any
              _id: { $in: ids as any[] },
            }).toArray()
            return ids.map((id) => docs.find((doc) => doc._id === id))
          }),
        )
      }

      return loaders
    }

    return { schema, createLoaders }
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
