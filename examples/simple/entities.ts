import { BaseEntity, Entity, Float, ID, String } from "./deps.ts";

@Entity()
export class Balance extends BaseEntity {
  @ID()
  id!: string;

  @String()
  account!: string;

  @Float()
  amount!: number;

  @String()
  token!: string;
}
