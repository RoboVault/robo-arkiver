import { Arkive, ArkiveManifest } from "./types.ts";
import { logger } from "../logger.ts";
import { DataSource } from "./data-source.ts";
import { mongoose } from "../deps.ts";
import { assertChain } from "../utils.ts";

export class Arkiver extends EventTarget {
  private readonly manifest: ArkiveManifest;
  private arkiveData: Arkive;
  private sources: DataSource[] = [];
  private mongoConnection?: string;
  private rpcUrls: Record<string, string>;

  constructor(params: {
    manifest: ArkiveManifest;
    mongoConnection?: string;
    arkiveData?: Arkive;
    rpcUrls: Record<string, string>;
  }) {
    super();
    const { mongoConnection, manifest, arkiveData, rpcUrls } = params;
    this.manifest = manifest;
    this.arkiveData = arkiveData ?? {
      id: 0,
      deployment: {
        id: 0,
        arkive_id: 0,
        major_version: 0,
        minor_version: 0,
        created_at: "",
        status: "pending",
        file_path: "",
      },
      user_id: "",
      name: "",
      public: false,
      created_at: "",
    };
    this.mongoConnection = mongoConnection;
    this.rpcUrls = rpcUrls;
  }

  public async run() {
    logger.info(
      `Running Arkiver for arkive ID number ${this.arkiveData.id}...`,
    );
    try {
      if (this.mongoConnection !== undefined) {
        logger.info(`Connecting to database...`);
        await mongoose.connect(this.mongoConnection, {
          dbName:
            `${this.arkiveData.id}-${this.arkiveData.deployment.major_version}`,
          // deno-lint-ignore no-explicit-any
        } as any);
        logger.info(`Connected to database`);
      }
      await this.initSources();
    } catch (e) {
      logger.error(`Error running arkiver: ${e}`);
    }
  }

  private async initSources() {
    logger.info(`Initializing data sources...`);
    const { dataSources } = this.manifest;
    for (const [chain, source] of Object.entries(dataSources)) {
      try {
        assertChain(chain);
      } catch (_e) {
        logger.error(`Invalid chain ${chain} in manifest, ignoring...`);
        continue;
      }
      const rpcUrl = this.rpcUrls[chain];
      if (rpcUrl === undefined) {
        logger.error(`No RPC URL found for chain ${chain}`);
        continue;
      }
      const dataSource = new DataSource({
        arkiveId: this.arkiveData.id,
        arkiveVersion: this.arkiveData.deployment.major_version,
        blockRange: source.options.blockRange,
        chain,
        contracts: source.contracts ?? [],
        rpcUrl: this.rpcUrls[chain] ?? source.options.rpcUrl,
        blockSources: source.blockHandlers ?? [],
      });
      await dataSource.run();
      this.sources.push(dataSource);
    }
  }
}
