export class Store extends Map<string, unknown> {
  constructor() {
    super();
  }

  async retrieve<TValue>(
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
