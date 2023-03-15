// deno-lint-ignore-file
import {
  BaseEntity,
  FieldRef,
  getMetadataArgsStorage,
  SchemaBuilder,
} from "./deps.ts";

export const buildSchemaFromEntities = (_entities: any[]) => {
  const entitiesToColumns = new Map<
    Function,
    any[]
  >();

  for (const column of getMetadataArgsStorage().columns) {
    if (typeof column.target === "string") continue;

    if (!entitiesToColumns.has(column.target)) {
      entitiesToColumns.set(column.target, [column]);
      continue;
    }

    entitiesToColumns.get(column.target)!.push(column);
  }

  const builder = new SchemaBuilder({});

  for (const [entity, columns] of entitiesToColumns.entries()) {
    builder.objectType(entity as any, {
      name: entity.name,
      fields: (t) => {
        const obj: Record<string, FieldRef> = {};
        for (const column of columns) {
          switch (true) {
            case column.options.type === "text" && column.options.primary: {
              obj[column.propertyName] = t.exposeID(column.propertyName, {
                nullable: false,
              });
              break;
            }
            case column.options.type === "text": {
              obj[column.propertyName] = t.exposeString(column.propertyName, {
                nullable: column.options.nullable,
              });
              break;
            }
            case column.options.type === "boolean": {
              obj[column.propertyName] = t.exposeBoolean(column.propertyName, {
                nullable: column.options.nullable,
              });
              break;
            }
            case column.options.type === "integer": {
              obj[column.propertyName] = t.exposeInt(column.propertyName, {
                nullable: column.options.nullable,
              });
              break;
            }
            case column.options.type === "float": {
              obj[column.propertyName] = t.exposeFloat(column.propertyName, {
                nullable: column.options.nullable,
              });
              break;
            }
            default: {
              throw new Error(
                `Unknown type for field ${column.propertyName} on entity ${entity.name}: ${column.options.type}`,
              );
            }
          }
        }
        return obj;
      },
    });

    builder.queryType({
      fields: (t) => ({
        [entity.name.toLowerCase()]: t.field({
          type: entity as any,
          args: {
            id: t.arg.id({ required: true }),
          },
          resolve: async (_parent, args) =>
            await (entity as unknown as typeof BaseEntity).findOne<any>({
              where: { id: args.id },
            }),
          nullable: true,
        }),
        [entity.name.toLowerCase() + "s"]: t.field({
          type: [entity as any],
          args: Object.fromEntries(columns.map((column) => {
            switch (true) {
              case column.options.type === "text" && column.options.primary: {
                return [column.propertyName, t.arg.id({ required: false })];
              }
              case column.options.type === "text": {
                return [column.propertyName, t.arg.string({ required: false })];
              }
              case column.options.type === "boolean": {
                return [
                  column.propertyName,
                  t.arg.boolean({ required: false }),
                ];
              }
              case column.options.type === "integer": {
                return [column.propertyName, t.arg.int({ required: false })];
              }
              case column.options.type === "float": {
                return [column.propertyName, t.arg.float({ required: false })];
              }
              default: {
                throw new Error(
                  `Unknown type for field ${column.propertyName} on entity ${entity.name}: ${column.options.type}`,
                );
              }
            }
          })),
          resolve: async (_parent, args) =>
            await (entity as unknown as typeof BaseEntity).find<any>({
              where: args,
            }),
        }),
      }),
    });
  }

  return builder.toSchema();
};
