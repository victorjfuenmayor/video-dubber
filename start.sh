#!/bin/sh
set -e

# Always update yt-dlp to latest to get newest YouTube patches
echo "Updating yt-dlp..."
yt-dlp -U 2>&1 | tail -3 || true

if [ -n "$TAILSCALE_AUTH_KEY" ] && [ -n "$TAILSCALE_EXIT_NODE" ]; then
  echo "Starting Tailscale in background..."
  tailscaled --tun=userspace-networking --socks5-server=127.0.0.1:1055 &
  sleep 2
  tailscale up --authkey="$TAILSCALE_AUTH_KEY" \
    --exit-node="$TAILSCALE_EXIT_NODE" \
    --exit-node-allow-lan-access=true \
    --hostname="video-dubber-render" &
  echo "Tailscale connecting in background..."
  sleep 8
  echo "=== Testing exit node routing ==="
  curl -s --max-time 15 --proxy socks5h://127.0.0.1:1055 https://ifconfig.me && echo " <- exit IP" || echo "EXIT NODE FAILED: traffic not routing through Synology"
  echo "================================="
fi

exec npm start
