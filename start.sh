#!/bin/sh
set -e

if [ -n "$TAILSCALE_AUTH_KEY" ] && [ -n "$TAILSCALE_EXIT_NODE" ]; then
  echo "Starting Tailscale..."
  tailscaled --tun=userspace-networking --socks5-server=127.0.0.1:1055 &
  sleep 3

  tailscale up --authkey="$TAILSCALE_AUTH_KEY" \
    --exit-node="$TAILSCALE_EXIT_NODE" \
    --exit-node-allow-lan-access=true \
    --hostname="video-dubber-render"

  # Wait until Tailscale reports a connection
  echo "Waiting for Tailscale to be ready..."
  for i in $(seq 1 15); do
    STATUS=$(tailscale status --json 2>/dev/null | grep -o '"BackendState":"[^"]*"' | head -1)
    echo "  attempt $i: $STATUS"
    if echo "$STATUS" | grep -q "Running"; then
      echo "Tailscale connected via exit node: $TAILSCALE_EXIT_NODE"
      break
    fi
    sleep 2
  done
fi

exec npm start
