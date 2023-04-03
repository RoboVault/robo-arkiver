// deno-lint-ignore-file no-explicit-any
import { Cache } from "../deps.ts";

export class Store extends Cache<any, any> {
  constructor(options: Cache.Options<any, any, unknown>) {
    super(options);
  }

  retrieve<TValue>(
    key: string,
    defaultValueAccessor: () => TValue | Promise<TValue>,
    options?: Cache.SetOptions<any, any, unknown>,
  ): TValue | Promise<TValue> {
    const value = super.get(key) as TValue | Promise<TValue>;
    if (value) {
      return value;
    }

    const defaultValue = defaultValueAccessor();

    super.set(key, defaultValue, options);

    return defaultValue;
  }
}
