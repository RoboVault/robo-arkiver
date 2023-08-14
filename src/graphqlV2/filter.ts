import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
} from 'npm:graphql'
import {
  CollectionFactory,
  ScalarWithRef,
  SchemaDefinition,
} from './collection.ts'

export type NumberFilterField = {
  eq?: number
  ne?: number
  in?: number[]
  nin?: number[]
  gt?: number
  gte?: number
  lt?: number
  lte?: number
}

export type StringFilterField = {
  eq?: string
  ne?: string
  in?: string[]
  nin?: string[]
  regexp?: string
}

export type FilterArg = {
  [key: string]:
    | NumberFilterField
    | StringFilterField
    | boolean
    | Omit<FilterArg, 'AND' | 'OR'>
} & {
  AND?: FilterArg
  OR?: FilterArg
}

type GraphQLFilterArg = {
  [key: string]: {
    type: GraphQLInputObjectType | typeof GraphQLBoolean
  }
}

const createNumberFilterField = (
  type: typeof GraphQLInt | typeof GraphQLFloat,
) => {
  return new GraphQLInputObjectType({
    name: 'IntFilterField',
    fields: {
      eq: {
        type: type,
      },
      ne: {
        type: type,
      },
      in: {
        type: new GraphQLList(type),
      },
      nin: {
        type: new GraphQLList(type),
      },
      gt: {
        type: type,
      },
      gte: {
        type: type,
      },
      lt: {
        type: type,
      },
      lte: {
        type: type,
      },
    },
  })
}
const intFilterField = createNumberFilterField(GraphQLInt)
const floatFilterField = createNumberFilterField(GraphQLFloat)

const stringFilterField = new GraphQLInputObjectType({
  name: 'StringFilterField',
  fields: {
    eq: {
      type: GraphQLString,
    },
    ne: {
      type: GraphQLString,
    },
    in: {
      type: new GraphQLList(GraphQLString),
    },
    nin: {
      type: new GraphQLList(GraphQLString),
    },
    regexp: {
      type: GraphQLString,
    },
  },
})

export const mapScalarToFilterField = (scalar: ScalarWithRef):
  | GraphQLInputObjectType
  | typeof GraphQLBoolean => {
  if (typeof scalar === 'string') {
    switch (scalar) {
      case 'string':
        return stringFilterField
      case 'int':
        return intFilterField
      case 'float':
        return floatFilterField
      case 'boolean':
        return GraphQLBoolean
      case 'bigint':
        return intFilterField
      case 'objectId':
        return stringFilterField
      default:
        throw new Error(`Unknown scalar type: ${scalar}`)
    }
  } else {
    return mapScalarToFilterField(scalar._schema._id)
  }
}

export const buildSortEnumValues = (
  schema: SchemaDefinition,
) => {
  const values = constructEnumValueRecursive('', [], schema)

  const valueMap = values.reduce((acc, value) => {
    acc[value] = { value }
    return acc
  }, {} as Record<string, { value: string }>)

  return valueMap
}

const constructEnumValueRecursive = (
  parentName: string | null,
  values: string[],
  schema: SchemaDefinition,
) => {
  const newValues: string[] = []
  for (const [key, value] of Object.entries(schema)) {
    const newKey = parentName ? `${parentName}_${key}` : key
    const innerValue = Array.isArray(value) ? value[0] : value
    if (typeof innerValue === 'string' || typeof innerValue === 'function') {
      newValues.push(newKey)
    } else {
      newValues.push(
        ...constructEnumValueRecursive(
          newKey,
          newValues,
          innerValue,
        ),
      )
    }
  }
  return values.concat(newValues)
}

const buildGraphQLFilterArgs = (
  parentName: string,
  schema: SchemaDefinition,
) => {
  const res = Object.entries(schema).reduce(
    (acc, [key, value]) => {
      const innerValue = Array.isArray(value) ? value[0] : value
      /**
       * Filter input type building steps
       *
       * 1. Is it scalar? -> use scalar input type
       * 2. Is it an array? -> use scalar input type
       * 3. Is it a subdocument? -> recurse
       * 4. Is it an array of subdocuments? -> recurse
       * 5. Is it a collection? -> treat as scalar
       */
      if (
        typeof innerValue === 'string' || typeof innerValue === 'function'
      ) {
        acc[key] = {
          type: mapScalarToFilterField(innerValue),
        }
      } else {
        acc[key] = {
          type: new GraphQLInputObjectType({
            name: `${parentName}_${key}Filter`,
            fields: buildGraphQLFilterArgs(`${parentName}_${key}`, innerValue),
          }),
        }
      }
      return acc
    },
    {} as GraphQLFilterArg,
  )
  return res
}

export const buildArrayQueryArgs = (
  collection: CollectionFactory<any, string>,
) => {
  const filter: GraphQLInputObjectType = new GraphQLInputObjectType({
    name: `${collection._name}Filter`,
    fields: () => ({
      AND: {
        type: filter,
      },
      OR: {
        type: filter,
      },
      ...buildGraphQLFilterArgs(collection._name, collection._schema),
    }),
  })

  const sort = new GraphQLInputObjectType({
    name: `${collection._name}Sort`,
    fields: {
      field: {
        type: new GraphQLEnumType({
          name: `${collection._name}SortField`,
          values: buildSortEnumValues(collection._schema),
        }),
      },
      order: {
        type: new GraphQLEnumType({
          name: `${collection._name}SortOrder`,
          values: {
            ASC: {
              value: 1,
            },
            DESC: {
              value: -1,
            },
          },
        }),
      },
    },
  })

  return {
    skip: {
      type: GraphQLInt,
    },
    limit: {
      type: GraphQLInt,
    },
    filter: {
      type: filter,
    },
    sort: {
      type: sort,
    },
  }
}
