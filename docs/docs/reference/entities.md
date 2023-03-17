---
sidebar_position: 3
---

# Entities

Entities are classes that describe the structure of your database schema. By extending the BaseEntity class and using decorators, you can create entities that represent tables in your database. These entities provide a straightforward way to interact with the data, making it easier to query and manipulate the information within your Arkive.

## Example entity

```ts title="entities/balance.ts"
import { BaseEntity, Float, Entity, ID } from "https://raw.githubusercontent.com/RoboVault/arkiver/main/mod.ts";

@Entity()
export class Balance extends BaseEntity {
	@ID()
	address!: string;

	@Float()
	balance!: string;
}
```
