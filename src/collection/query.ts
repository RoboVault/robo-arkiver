import { AggregatePipeline } from 'https://raw.githubusercontent.com/Robo-Labs/mongo/main/mod.ts'
import { FilterArg, operatorSet } from './filter.ts'
import { isSuperset, mergeDeep } from '../utils.ts'

export const buildAggregationStages = (queryArgs: {
  filter?: FilterArg
  skip?: number
  limit?: number
  sort?: { field: string; order: 1 | -1 }
}) => {
  // deno-lint-ignore no-explicit-any
  const stages: AggregatePipeline<any>[] = []

  if (queryArgs.filter) {
    stages.push({
      $match: buildFilterStage(queryArgs.filter),
    })
  }

  if (queryArgs.sort) {
    stages.push({
      $sort: {
        [queryArgs.sort.field]: queryArgs.sort.order,
      },
    })
  }

  if (queryArgs.skip) {
    stages.push({
      $skip: queryArgs.skip,
    })
  }

  if (queryArgs.limit) {
    stages.push({
      $limit: queryArgs.limit,
    })
  }

  return stages
}

const buildFilterStage = (
  filter: FilterArg,
  parentName: string | null = null,
) => {
  // deno-lint-ignore no-explicit-any
  let stage: AggregatePipeline<any> = {}

  for (const [key, value] of Object.entries(filter)) {
    const newKey = parentName ? `${parentName}.${key}` : key

    if (key === 'OR' || key === 'AND') {
      continue
    } else if (
      typeof value === 'boolean'
    ) {
      stage[newKey] = value
    } else if (isSuperset(operatorSet, new Set(Object.keys(value)))) {
      stage[newKey] = Object.fromEntries(
        Object.entries(value).map(([k, v]) => {
          if (k === '_regex') v = new RegExp(v) //TODO @hazelnutcloud: this is a hack to get regex working, use GraphQLScalarType instead
          return [k.replace('_', '$'), v]
        }),
      )
    } else {
      const innerStage = buildFilterStage(value, newKey)

      stage = mergeDeep(stage, innerStage)
    }
  }

  if (filter.AND) {
    const and = buildFilterStage(filter.AND as FilterArg)

    stage = mergeDeep(stage, and)
  }

  if (filter.OR) {
    stage = {
      $or: [
        buildFilterStage(filter.OR),
        stage,
      ],
    }
  }

  return stage
}
