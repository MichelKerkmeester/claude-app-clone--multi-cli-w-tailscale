#!/bin/sh
# ───────────────────────────────────────────────────────────────
# COMPONENT: TAILSCALE SERVE DEPLOYMENT
# ───────────────────────────────────────────────────────────────
# Bring up the loopback relay and PWA, then expose only tailnet HTTPS routes.
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CONFIG_FILE=${1:-"$ROOT_DIR/deploy/serve.env"}

if [ ! -f "$CONFIG_FILE" ]; then
  printf '%s\n' "Missing $CONFIG_FILE. Copy deploy/serve.env.example and set the exact tailnet HTTPS origin." >&2
  exit 1
fi

set -a
. "$CONFIG_FILE"
set +a

: "${PI_REMOTE_PUBLIC_ORIGIN:?PI_REMOTE_PUBLIC_ORIGIN is required}"
PI_REMOTE_RELAY_PORT=${PI_REMOTE_RELAY_PORT:-4310}
PI_REMOTE_WEB_PORT=${PI_REMOTE_WEB_PORT:-4173}
PI_REMOTE_PRINT_ENROLLMENT=${PI_REMOTE_PRINT_ENROLLMENT:-1}
PI_REMOTE_SERVE_SECRET=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
export PI_REMOTE_PUBLIC_ORIGIN PI_REMOTE_PRINT_ENROLLMENT PI_REMOTE_SERVE_SECRET
export PI_REMOTE_PORT=$PI_REMOTE_RELAY_PORT

cleanup() {
  tailscale serve --https=443 --set-path=/api off >/dev/null 2>&1 || true
  tailscale serve --https=443 --set-path=/health off >/dev/null 2>&1 || true
  tailscale serve --https=443 --set-path=/ off >/dev/null 2>&1 || true
  kill "$RELAY_PID" "$WEB_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR"
npm run start -w @pi-remote/relay &
RELAY_PID=$!
npm run preview -w @pi-remote/web -- --host 127.0.0.1 --port "$PI_REMOTE_WEB_PORT" &
WEB_PID=$!

# Funnel is a separate public surface and must remain disabled for this deployment.
tailscale funnel --https=443 off >/dev/null 2>&1 || true
tailscale serve --bg --https=443 --set-path=/ "http://127.0.0.1:$PI_REMOTE_WEB_PORT"
tailscale serve --bg --https=443 --set-path=/api \
  "http://127.0.0.1:$PI_REMOTE_RELAY_PORT/_serve/$PI_REMOTE_SERVE_SECRET/api"
tailscale serve --bg --https=443 --set-path=/health \
  "http://127.0.0.1:$PI_REMOTE_RELAY_PORT/_serve/$PI_REMOTE_SERVE_SECRET/health"

printf '%s\n' 'Pi Remote is configured for tailnet-only Serve.'
printf '%s\n' 'Operator verification required: inspect `tailscale serve status`, confirm Funnel is absent, then enroll over the HTTPS URL.'
wait "$RELAY_PID" "$WEB_PID"
