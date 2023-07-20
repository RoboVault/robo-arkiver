#!/bin/bash
source scripts/.env
arkiver start ./ -c mongodb://localhost:27017 --rpc-url $RPC_URL