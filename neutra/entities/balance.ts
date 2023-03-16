import { Entity, ID, String, Float, BaseEntity } from "../deps.ts";

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