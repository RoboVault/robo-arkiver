// deno-lint-ignore-file ban-types
import { Cache } from "../deps.ts";

export class Store extends Cache<{}, {}> {
  constructor(options: Cache.Options<{}, {}>) {
    super(options);
  }

  retrieve<TValue extends {}>(
    key: string,
    defaultValueAccessor: () => TValue | Promise<TValue>,
    options?: Cache.SetOptions,
  ) {
    const value = super.get(key) as TValue | Promise<TValue>;
    if (value) {
      return value;
    }

    const defaultValue = defaultValueAccessor();

    super.set(key, defaultValue, options);

    return defaultValue;
  }
}
