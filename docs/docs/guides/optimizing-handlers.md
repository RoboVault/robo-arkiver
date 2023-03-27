---
sidebar_position: 1
---

# Optimizing your handler functions

Optimizing your handler functions is crucial to achieving the best performance for your Arkive. One way to optimize your handler functions is by leveraging the store object provided to the handler. The store object allows you to cache data, reducing the number of requests and database interactions, and thus improving the overall performance of your handler functions.

Here are some tips on how to optimize your handler functions using the store object:

1. Cache data with `store.retrieve()`
The store.retrieve() method is a convenient way to cache data. It is a wrapper around Map.get() that, if the key is not found in the store, calls the provided function to fetch the data, caches it, and then returns it. By using store.retrieve(), you can minimize the number of requests and database interactions.

```ts
const decimals = await store.retrieve(
  `${address}:decimals`,
  async () =>
    await client.readContract({
      abi: erc20,
      functionName: "decimals",
      address,
    }),
);
```

2. Batch data retrieval
To further optimize your handler functions, batch data retrieval using Promise.all() can help reduce the number of asynchronous calls. This allows you to fetch multiple pieces of data concurrently, which can improve the performance of your handler functions.

```ts
    const [senderBalance, receiverBalance] = await Promise.all([
      store.retrieve(
        `${from}:${address}:balance`,
        async () =>
          await Balance.findOne({ account: from }) ??
            new Balance({
              amount: 0,
              token: address,
              account: from,
            }),
      ),
      store.retrieve(
        `${to}:${address}:balance`,
        async () =>
          await Balance.findOne({ account: to }) ??
            new Balance({
              amount: 0,
              token: address,
              account: to,
            }),
      ),
    ]);
```

3. Use `store.set()` to update the cache
After processing and updating the data, use store.set() to update the cached data. This ensures that your cache stays up-to-date and future retrievals will get the latest data without the need for additional database interactions.

```ts
senderBalance.amount -= parsedValue;
receiverBalance.amount += parsedValue;

store.set(`${from}:${address}:balance`, senderBalance.save());
store.set(`${to}:${address}:balance`, receiverBalance.save());
```

By following these tips and leveraging the store object in your handler functions, you can optimize your Arkive's performance and spend less time waiting for your Arkive to process data.