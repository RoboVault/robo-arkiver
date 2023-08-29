import { Collection, Database, ObjectId } from '../deps.ts'

export type Scalar =
  | 'string'
  | 'int'
  | 'float'
  | 'boolean'
  | 'bigint'
  | 'objectId'
// deno-lint-ignore no-explicit-any
export type ScalarWithRef = Scalar | CollectionFactory<any, string>
export type SchemaDefinition = {
  [key: string]: ScalarWithRef | [ScalarWithRef] | SchemaDefinition | [
    SchemaDefinition,
  ]
} & { _id?: Scalar }

export type ScalarTypeMap = {
  string: string
  int: number
  float: number
  boolean: boolean
  bigint: bigint
  objectId: ObjectId
}

export type ScalarWithRefToType<T extends ScalarWithRef> = T extends
  keyof ScalarTypeMap ? ScalarTypeMap[T]
  : T extends { _schema: infer Schema extends SchemaDefinition }
    ? Schema extends { _id: infer Id extends Scalar } ? ScalarWithRefToType<Id>
    : ObjectId
  : never

export type Document<TSchemaDefinition extends SchemaDefinition> =
  | (
    & (TSchemaDefinition['_id'] extends Exclude<Scalar, 'objectId'> ? {
        _id: ScalarWithRefToType<TSchemaDefinition['_id']>
      }
      : {
        _id?: ObjectId
      })
    & {
      [Key in Exclude<keyof TSchemaDefinition, '_id'>]:
        TSchemaDefinition[Key] extends ScalarWithRef
          ? ScalarWithRefToType<TSchemaDefinition[Key]>
          : TSchemaDefinition[Key] extends [infer T extends ScalarWithRef]
            ? ScalarWithRefToType<T>[]
          : TSchemaDefinition[Key] extends SchemaDefinition
            ? Omit<Document<TSchemaDefinition[Key]>, '_id'>
          : TSchemaDefinition[Key] extends [infer T extends SchemaDefinition]
            ? Omit<Document<T>, '_id'>[]
          : never
    }
  )
  | never

export type CollectionFactory<
  TSchema extends SchemaDefinition,
  TName extends string,
> =
  | {
    (db: Database): Collection<Document<TSchema>>
    _schema: TSchema
    _name: TName
    infer: Document<TSchema>
  }
  | never

export const createCollection = <
  TSchema extends SchemaDefinition,
  TName extends string,
>(
  name: TName,
  schema: TSchema,
): CollectionFactory<TSchema, TName> => {
  const col = (db: Database) => {
    return db.collection<Document<TSchema>>(name)
  }

  col._schema = schema
  col._name = name
  col.infer = {} as Document<TSchema>

  return col
}
