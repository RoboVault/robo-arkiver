import { getEnv } from "./utils.ts";
import { InfluxDB, FluxTableMetaData } from "../../deps.ts";

const url = getEnv("INFLUXDB_URL");
const token = getEnv("INFLUXDB_TOKEN");
const org = getEnv("INFLUXDB_ORG");
const bucket = getEnv("INFLUXDB_BUCKET");

const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

export interface queryOptions {
  measurement?: string;
  field: string;
  groupKeys?: string[];
  filters?: Record<string, unknown>;
  range: { start: Date; end: Date };
}

export class Measurement {
  private measurement?: string;

  constructor(measurement?: string) {
    this.measurement = measurement;
  }

  public async getFirstValue(
    options: queryOptions
  ): Promise<number | undefined> {
    const res = await this.query(options, "|> first()");
    return res[0]?._value as number;
  }

  public async getLastValue(
    options: queryOptions
  ): Promise<number | undefined> {
    const res = await this.query(options, "|> last()");
    return res[0]?._value as number;
  }

  public async query(
    options: queryOptions,
    raw: string
  ): Promise<Record<string, unknown>[]> {
    let query = `from(bucket: "${bucket}")`;
    const range = `|> range(start: ${options.range.start.toISOString()}, stop: ${options.range.end.toISOString()})`;
    const measurement = `${
      this.measurement
        ? `|> filter(fn: (r) => r._measurement == "${this.measurement}")`
        : ""
    }`;
    const filters = `${
      options.filters
        ? `|> filter(fn: (r) => ${Object.entries(options.filters)
            .map(([tag, value]) => `r.${tag} == "${value}"`)
            .join(" and ")})`
        : ""
    }`;
    const field = `|> filter(fn: (r) => r._field == "${options.field}")`;
    const groupKeys = `${
      options.groupKeys
        ? `|> group(columns: ${JSON.stringify(options.groupKeys)})`
        : ""
    }`;
    const fnCall = raw ?? "";

    query = `${query} ${range} ${measurement} ${filters} ${field} ${groupKeys} ${fnCall}`;

    const observer = {
      next(row: string[], tableMeta: FluxTableMetaData) {
        const o = tableMeta.toObject(row);
        return o;
      },
    };

    const result: Record<string, unknown>[] =
      (await queryApi?.collectRows(query, observer.next)) ?? [];

    return result;
  }
}
