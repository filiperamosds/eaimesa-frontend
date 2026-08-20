#!/usr/bin/env bash
# Front não sobe daemon. Garante .env e deps após o boot do Cloud Agent.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

if [[ ! -d node_modules ]]; then
  pnpm install
fi

echo "Frontend pronto. API Laravel deve estar em http://localhost:8000 (repo eaimesa-backend)."
