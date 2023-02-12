# Arkive example
This is a simple example of an arkive that indexes all USDC transfers on avalanche.

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
3. Run `arkiver deploy`
    ```bash
    arkiver deploy . myFirstArkive
    ```