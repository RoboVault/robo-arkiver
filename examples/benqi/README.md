# Arkive example
This is a simple example of an arkive that indexes the BenQI protocol on avalanche.

## Prerequisites
* [deno](https://deno.land/)
* [arkiver-cli](https://github.com/RoboVault/robo-arkiver-cli)

## Deploying
1. Clone this repo
2. Sign in to the arkiver cli
    ```bash
    # login
    arkiver login

    # signup
    arkiver signup
    ```
3. Run the arkive locally
   ```bash
    arkiver start .
    ```
4. Run `arkiver deploy`
    ```bash
    arkiver deploy . myFirstArkive
    ```

## Schema
| Measurement | Field | Type | Description |
| ----------- | ----- | ---- | ----------- |
| `tvl` | `amount` | `number` | The total value locked for the account |
|| `symbol` | `string` | The symbol of the asset |
|| `account` | `string` | The account that the TVL is for |
