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
} from '../collection.ts'
import { GraphQLDateTime } from 'npm:graphql-scalars'

export type NumberFilterField = {
  _eq?: number
  _ne?: number
  _in?: number[]
  _nin?: number[]
  _gt?: number
  _gte?: number
  _lt?: number
  _lte?: number
}

export type DateFilterField = {
  [key in keyof NumberFilterField]?: NumberFilterField[key] extends
    ((infer _)[] | undefined) ? Date[]
    : Date
}

export type StringFilterField = {
  _eq?: string
  _ne?: string
  _in?: string[]
  _nin?: string[]
  _regex?: string
}

export type FilterArg = {
  [key: string]:
    | NumberFilterField
    | StringFilterField
    | DateFilterField
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
  name: string,
  type: typeof GraphQLInt | typeof GraphQLFloat | typeof GraphQLDateTime,
) => {
  return new GraphQLInputObjectType({
    name,
    fields: {
      _eq: {
        type: type,
      },
      _ne: {
        type: type,
      },
      _in: {
        type: new GraphQLList(type),
      },
      _nin: {
        type: new GraphQLList(type),
      },
      _gt: {
        type: type,
      },
      _gte: {
        type: type,
      },
      _lt: {
        type: type,
      },
      _lte: {
        type: type,
      },
    },
  })
}

const createIntFilterField = (name: string) =>
  createNumberFilterField(name, GraphQLInt)
const createFloatFilterField = (name: string) =>
  createNumberFilterField(name, GraphQLFloat)
const createDateFilterField = (name: string) =>
  createNumberFilterField(name, GraphQLDateTime)

const createStringFilterField = (name: string) =>
  new GraphQLInputObjectType({
    name,
    fields: {
      _eq: {
        type: GraphQLString,
      },
      _ne: {
        type: GraphQLString,
      },
      _in: {
        type: new GraphQLList(GraphQLString),
      },
      _nin: {
        type: new GraphQLList(GraphQLString),
      },
      _regex: {
        type: GraphQLString,
      },
    },
  })

export const operatorSet = new Set<
  keyof NumberFilterField | keyof StringFilterField
>([
  '_eq',
  '_ne',
  '_in',
  '_nin',
  '_gt',
  '_gte',
  '_lt',
  '_lte',
  '_regex',
])

export const mapScalarToFilterFieldCreator = (
  scalar: ScalarWithRef,
): (name: string) => GraphQLInputObjectType | typeof GraphQLBoolean => {
  if (typeof scalar === 'string') {
    switch (scalar) {
      case 'string':
        return createStringFilterField
      case 'int':
        return createIntFilterField
      case 'float':
        return createFloatFilterField
      case 'boolean':
        return () => GraphQLBoolean
      case 'bigint':
        return createIntFilterField
      case 'date':
        return createDateFilterField
      case 'objectId':
        return createStringFilterField
    }
    scalar satisfies never
  } else {
    return mapScalarToFilterFieldCreator(scalar._schema._id)
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
          type: mapScalarToFilterFieldCreator(innerValue)(
            `${parentName}_${key}`,
          ),
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
  // deno-lint-ignore no-explicit-any
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
