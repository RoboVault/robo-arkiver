import { IndexedBlockHeightParams, StatusProvider } from "./interfaces.ts";
import { type FluxTableMetaData, InfluxDB, type QueryApi } from "../../deps.ts";

export interface queryOptions {
  measurement?: string;
  field: string;
  groupKeys?: string[];
  filters?: Record<string, unknown>;
  range: { start: Date; end: Date };
}

export class InfluxDBAdapter implements StatusProvider {
  private queryApi: QueryApi;
  private bucket: string;

  constructor(params: {
    url: string;
    token: string;
    org: string;
    bucket: string;
  }) {
    const { url, token, org, bucket } = params;
    this.queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    this.bucket = bucket;
  }

  public async getIndexedBlockHeight(
    params: IndexedBlockHeightParams,
  ): Promise<number> {
    const {
      arkiveId,
      arkiveVersion,
      chain,
    } = params;
    const indexedBlockHeight = await this.getLastValue({
      field: "blockHeight",
      range: { start: new Date(0), end: new Date() },
      filters: {
        arkiveId,
        arkiveVersion,
        chain,
      },
      groupKeys: [
        "arkiveId",
        "arkiveVersion",
        "chain",
      ],
    });
    return indexedBlockHeight || 0;
  }

  public async getFirstValue(
    options: queryOptions,
  ): Promise<number | undefined> {
    const res = await this.query(options, "|> first()");
    return res[0]?._value as number;
  }

  public async getLastValue(
    options: queryOptions,
  ): Promise<number | undefined> {
    const res = await this.query(options, "|> last()");
    return res[0]?._value as number;
  }

  public async query(
    options: queryOptions,
    raw: string,
  ): Promise<Record<string, unknown>[]> {
    let query = `from(bucket: "${this.bucket}")`;
    const range =
      `|> range(start: ${options.range.start.toISOString()}, stop: ${options.range.end.toISOString()})`;
    const measurement = `${
      options.measurement
        ? `|> filter(fn: (r) => r._measurement == "${options.measurement}")`
        : ""
    }`;
    const filters = `${
      options.filters
        ? `|> filter(fn: (r) => ${
          Object.entries(options.filters)
            .map(([tag, value]) => `r.${tag} == "${value}"`)
            .join(" and ")
        })`
        : ""
    }`;
    const field = `|> filter(fn: (r) => r._field == "${options.field}")`;
    const groupKeys = `${
      options.groupKeys
        ? `|> group(columns: ${JSON.stringify(options.groupKeys)})`
        : ""
    }`;
    const fnCall = raw ?? "";

    query =
      `${query} ${range} ${measurement} ${filters} ${field} ${groupKeys} ${fnCall}`;

    const observer = {
      next(row: string[], tableMeta: FluxTableMetaData) {
        const o = tableMeta.toObject(row);
        return o;
      },
    };

    const result: Record<string, unknown>[] =
      (await this.queryApi?.collectRows(query, observer.next)) ?? [];

    return result;
  }
}
