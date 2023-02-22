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
      return value;
    }

    let defaultValue = defaultValueAccessor();
    if (defaultValue instanceof Promise) {
      defaultValue = await defaultValue;
    }

    super.set(key, defaultValue);
    return defaultValue;
  }
}
