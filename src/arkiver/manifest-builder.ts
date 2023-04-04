// deno-lint-ignore-file no-explicit-any
import { supportedChains } from "../chains.ts";
import {
  ArkiveManifest,
  BlockHandler,
  Contract,
  DataSource,
  EventHandler,
} from "./types.ts";
import {
  Abi,
  Address,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  mongoose,
} from "../deps.ts";

export class Manifest {
  public manifest: ArkiveManifest = {
    dataSources: {},
    entities: [],
  };

  public addChain(
    chain: keyof typeof supportedChains,
  ) {
    return new DataSourceBuilder(this, chain);
  }

  public addEntity(entity: mongoose.Model<any>) {
    this.manifest.entities.push({ model: entity, list: true });
    return this;
  }

  public addEntities(entities: mongoose.Model<any>[]) {
    this.manifest.entities.push(...entities.map((entity) => ({
      model: entity,
      list: true,
    })));
    return this;
  }

  public build() {
    return this.manifest;
  }
}

export class DataSourceBuilder {
  public dataSource: DataSource = {};

  constructor(
    private builder: Manifest,
    chain: keyof typeof supportedChains,
  ) {
    if (this.builder.manifest.dataSources[chain] != undefined) {
      throw new Error(`Cannot add data source for ${chain} more than once.`);
    }
    this.builder.manifest.dataSources[chain] = this.dataSource;
  }

  public addContract<const TAbi extends Abi>(
    abi: TAbi,
  ) {
    if (this.dataSource.contracts == undefined) {
      this.dataSource.contracts = [];
    }
    return new ContractBuilder(this, abi);
  }

  public addBlockHandler(
    options: {
      startBlockHeight: bigint | "live";
      blockInterval: number;
      handler: BlockHandler;
    },
  ) {
    if (this.dataSource.blockHandlers == undefined) {
      this.dataSource.blockHandlers = [];
    }

    const { blockInterval, startBlockHeight, handler } = options;

    this.dataSource.blockHandlers.push({
      handler,
      startBlockHeight,
      blockInterval: BigInt(blockInterval),
    });
    return this;
  }
}

export class ContractBuilder<
  const TAbi extends Abi,
> {
  public contract: Contract;

  constructor(
    private builder: DataSourceBuilder,
    abi: TAbi,
  ) {
    const existing = this.builder.dataSource.contracts?.find(
      (contract) => contract.abi === abi,
    );
    if (existing !== undefined) {
      this.contract = existing;
    } else {
      this.contract = {
        abi,
        sources: [],
        events: [],
        id: crypto.randomUUID(),
      };
      this.builder.dataSource.contracts!.push(this.contract);
    }
  }

  public addSource(
    address: Address | "*",
    startBlockHeight: bigint,
  ) {
    if (address === "*" && this.contract.sources.length > 0) {
      throw new Error("Cannot add wildcard source after other sources.");
    }
    this.contract.sources.push({
      address,
      startBlockHeight,
    });
    return this;
  }

  public addSources(sources: Record<Address | "*", bigint>) {
    if (
      sources["*"] !== undefined &&
      (Object.keys(sources).length > 1 || this.contract.sources.length > 0)
    ) {
      throw new Error("Cannot add wildcard source after other sources.");
    }

    for (const [address, startBlockHeight] of Object.entries(sources)) {
      this.addSource(address as Address, startBlockHeight);
    }
    return this;
  }

  public addEventHandler<
    TEventName extends ExtractAbiEventNames<TAbi>,
    TEventHandler extends EventHandler<
      ExtractAbiEvent<TAbi, TEventName>,
      TEventName
    >,
  >(
    name: TEventName,
    handler: TEventHandler,
  ) {
    const existing = this.contract.events.find(
      (event) => event.name === name,
    );

    if (existing !== undefined) {
      throw new Error(`Cannot add event ${name} more than once.`);
    }

    this.contract.events.push({
      name,
      handler,
    });
    return this;
  }
}
