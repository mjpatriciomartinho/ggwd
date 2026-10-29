#!/usr/bin/env bash
# Runs a wrangler/OpenNext command with the Cloudflare credentials from María's SSM
# (CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, injected as env vars by `secrets run`).
set -euo pipefail
exec "$HOME/.local/bin/secrets" run -- "$@"
