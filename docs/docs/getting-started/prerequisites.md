---
sidebar_position: 1
---


# Prerequisites

## Install Deno

Deno is a fast JavaScript runtime with built-in security features and native TypeScript support written in Rust. The Arkiver uses Deno to run handler functions in plain TypeScript (or JavaScript).

You can install deno by following the instructions on the [Deno website](https://deno.land/manual/getting_started/installation).

## Setup IDE

### VSCode

Find and install the official [Deno extension for VSCode](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)

### LSP

Deno provides a language server protocol (LSP) implementation that can be used with any editor that supports LSP. You can find more information about the LSP implementation [here](https://deno.land/manual/advanced/language_server).

## Install the Arkiver CLI

The Arkiver CLI is used to deploy your arkives or run them locally for debugging. You can install the Arkiver CLI by running the following command:

```bash
deno install -A --unstable --name arkiver https://raw.githubusercontent.com/RoboVault/robo-arkiver/main/cli.ts
```

Check that the installation was successful by running the following command:

```bash
arkiver --help
```