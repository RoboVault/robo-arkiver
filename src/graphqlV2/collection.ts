import {
  Collection,
  Database,
  ObjectId,
} from 'https://raw.githubusercontent.com/Robo-Labs/mongo/main/mod.ts'

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

export type ScalarWithRefToType<T extends ScalarWithRef> = T extends 'string'
  ? string
  : T extends 'int' ? number
  : T extends 'float' ? number
  : T extends 'boolean' ? boolean
  : T extends 'bigint' ? bigint
  : T extends 'objectId' ? ObjectId
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
            ? Document<TSchemaDefinition[Key]>
          : TSchemaDefinition[Key] extends [infer T extends SchemaDefinition]
            ? Document<T>[]
          : never
    }
  )
  | never

export type CollectionFactory<
  TSchema extends SchemaDefinition,
  TName extends string,
  TDocument extends Document<TSchema> = Document<TSchema>,
> =
  | { (db: Database): Collection<TDocument>; _schema: TSchema; _name: TName }
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

  return col
}
