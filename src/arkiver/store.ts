// deno-lint-ignore-file ban-types
import { LRU } from "../deps.ts";

export class Store extends LRU<{}, {}> {
  constructor(options: LRU.Options<{}, {}>) {
    super(options);
  }

  async retrieve<TValue extends {}>(
    key: string,
    defaultValueAccessor: () => TValue | Promise<TValue>,
  ): Promise<TValue> {
    const value = super.get(key) as TValue | Promise<TValue>;
    if (value) {
      if (value instanceof Promise) {
        return await value;
      }
      return value;
    }

    const defaultValue = defaultValueAccessor();

    super.set(key, defaultValue);

    return defaultValue;
  }
}
