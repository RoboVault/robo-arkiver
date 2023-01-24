# RoboArkiver

RoboArkiver is a highly configurable and extensible tool for indexing evm data.

## Run locally

### Prerequisites
* [deno](https://deno.land/)
* [docker](https://www.docker.com/)

### Run the indexer locally
1. clone the repo
2. setup a supabase project
3. copy .env.sample to .env and fill the supabase variables. you can omit the influxdb variables if you're not persisting the data
4. run `deno task dev`

### Deploy an arkive
1. Follow [these steps.](https://github.com/RoboVault/telegraf-indexer/tree/arkive)