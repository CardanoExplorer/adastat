#!/usr/bin/env bash

set -euo pipefail

sudo chown node:node frontend/node_modules backend/node_modules

pnpm --dir backend install --frozen-lockfile
pnpm --dir frontend install --frozen-lockfile
