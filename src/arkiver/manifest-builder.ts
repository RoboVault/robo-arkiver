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
} from "../deps.ts";

export class ManifestBuilder {
  public manifest: ArkiveManifest = {
    dataSources: {},
  };

  public addDataSource(chain: typeof supportedChains[number]) {
    return new DataSourceBuilder(this, chain);
  }

  public build() {
    return this.manifest;
  }
}

export class DataSourceBuilder {
  public dataSource: DataSource = {};

  constructor(
    private builder: ManifestBuilder,
    chain: typeof supportedChains[number],
  ) {
    if (this.builder.manifest.dataSources[chain] != undefined) {
      throw new Error(`Cannot add data source for ${chain} more than once.`);
    }
    this.builder.manifest.dataSources[chain] = this.dataSource;
  }

  public addContract<TAbi extends Abi>(
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
  TAbi extends Abi,
> {
  public contract: Contract;

  constructor(
    private builder: DataSourceBuilder,
    abi: TAbi,
  ) {
    this.contract = {
      abi,
      sources: [],
      events: [],
      id: crypto.randomUUID(),
    };
    const existing = this.builder.dataSource.contracts?.find(
      (contract) => contract.abi === abi,
    );
    if (existing !== undefined) {
      this.contract = existing;
    } else {
      this.builder.dataSource.contracts!.push(this.contract);
    }
  }

  public addSource(
    address: Address,
    startBlockHeight: bigint,
  ) {
    this.contract.sources.push({
      address,
      startBlockHeight,
    });
    return this;
  }

  public addSources(sources: Record<Address, bigint>) {
    for (const [address, startBlockHeight] of Object.entries(sources)) {
      this.addSource(address as Address, startBlockHeight);
    }
    return this;
  }

  public addEventHandler<
    TEventName extends ExtractAbiEventNames<TAbi>,
  >(
    name: TEventName | ExtractAbiEventNames<TAbi>,
    handler: EventHandler<ExtractAbiEvent<TAbi, TEventName>, TEventName>,
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
