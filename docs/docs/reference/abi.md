---
sidebar_position: 5
---

# ABIs

Application Binary Interfaces (ABIs) are JSON representations of a contract's
functions and events. They enable interaction with the contract on the
blockchain by providing the necessary information to encode and decode the data
involved in these interactions. ABIs should be stored in the /abis/ directory of
your project and imported into your handler functions as needed.

## Example ABI

```ts
export default [{
...
}] as const; // must add `as const` to get full typings
```
