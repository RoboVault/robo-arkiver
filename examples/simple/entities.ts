import { BaseEntity, Entity, Float, Int, ID, String } from "./deps.ts";

@Entity()
export class GLP extends BaseEntity {
  @ID()
  id!: string;

  @Int()
  block!: number;

  @Int()
  timestamp!: number;

  @Float()
  glpAum!: number;

  @Float()
  glpTotalSupply!: number;

  @Float()
  glpPrice!: number;

  @Float()
  btcReserves!: number;

  @Float()
  ethReserves!: number;

  @Float()
  btcPrice!: number;

  @Float()
  ethPrice!: number;

  @Float()
  ethAumA!: number;

  @Float()
  btcAumA!: number;

  @Float()
  ethAumB!: number;

  @Float()
  btcAumB!: number;

  @Float()
  ethAumC!: number;

  @Float()
  btcAumC!: number;

  @Float()
  btcUtilisation!: number;

  @Float()
  ethUtilisation!: number;

  @Float()
  cumulativeRewardPerToken!: number;

  @Float()
  gmxPrice!: number;

}

