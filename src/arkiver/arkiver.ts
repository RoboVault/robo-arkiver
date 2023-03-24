import { Arkive, ArkiveManifest } from "./types.ts";
import { logger } from "../logger.ts";
import { DataSource } from "./data-source.ts";
import { mongoose } from "../deps.ts";

export class Arkiver extends EventTarget {
  private readonly manifest: ArkiveManifest;
  private arkiveData: Arkive;
  private sources: DataSource[] = [];
  private dbConfig: {
    database: string;
    host: string;
    password?: string;
    port: number;
    username?: string;
  };
  private rpcUrls: Record<string, string>;

  constructor(params: {
    manifest: ArkiveManifest;
    dbConfig: {
      database: string;
      host: string;
      port: number;
      username?: string;
      password?: string;
    };
    arkiveData?: Arkive;
    rpcUrls: Record<string, string>;
  }) {
    super();
    const { dbConfig, manifest, arkiveData, rpcUrls } = params;
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
    this.dbConfig = dbConfig;
    this.rpcUrls = rpcUrls;
  }

  public async run() {
    logger.info(
      `Running Arkiver for arkive ID number ${this.arkiveData.id}...`,
    );
    try {
      logger.info(`Connecting to database...`);
      const { database, host, password, port, username } = this.dbConfig;
      await mongoose.connect(
        `mongodb://${username ?? ""}${username && password ? ":" : ""}${
          password ?? ""
        }${username && password ? "@" : ""}${host ?? "localhost"}:${
          port ?? 27017
        }/${
          database ??
            `${this.arkiveData.id}:${this.arkiveData.deployment.major_version}`
        }`,
      );
      await this.initSources();
    } catch (e) {
      logger.error(`Error running arkiver: ${e}`);
    }
  }

  private async initSources() {
    logger.info(`Initializing data sources...`);
    const { dataSources } = this.manifest;
    for (const [chain, source] of Object.entries(dataSources)) {
      const rpcUrl = this.rpcUrls[chain];
      if (rpcUrl === undefined) {
        logger.error(`No RPC URL found for chain ${chain}`);
        continue;
      }
      const dataSource = new DataSource({
        arkiveId: this.arkiveData.id,
        arkiveVersion: this.arkiveData.deployment.major_version,
        blockRange: 3000n,
        chain,
        contracts: source.contracts ?? [],
        rpcUrl: this.rpcUrls[chain],
        blockSources: source.blockHandlers ?? [],
      });
      await dataSource.run();
      this.sources.push(dataSource);
    }
  }
}
