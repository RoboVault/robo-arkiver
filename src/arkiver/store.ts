import { Cache } from "../deps.ts";

export class Store extends Cache<string, unknown> {
  constructor(options: Cache.Options<string, unknown>) {
    super(options);
  }

  retrieve<TValue>(
    key: string,
    defaultValueAccessor: () => TValue | Promise<TValue>,
    options?: Cache.SetOptions,
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
