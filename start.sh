#!/bin/sh
set -e

if [ -n "$TAILSCALE_AUTH_KEY" ] && [ -n "$TAILSCALE_EXIT_NODE" ]; then
  echo "Starting Tailscale in background..."
  tailscaled --tun=userspace-networking --socks5-server=127.0.0.1:1055 &
  sleep 2
  tailscale up --authkey="$TAILSCALE_AUTH_KEY" \
    --exit-node="$TAILSCALE_EXIT_NODE" \
    --exit-node-allow-lan-access=true \
    --hostname="video-dubber-render" &
  echo "Tailscale connecting in background, starting app..."
fi

exec npm start
