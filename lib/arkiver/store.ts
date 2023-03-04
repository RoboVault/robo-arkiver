export class Store extends Map<string, unknown> {
  constructor() {
    super();
  }

  async retrieve(
    key: string,
    defaultValueAccessor: () => unknown | Promise<unknown>,
  ) {
    const value = super.get(key);
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
