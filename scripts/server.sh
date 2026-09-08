#!/usr/bin/env bash
# Start/stop/status the Next.js dev server as a detached background process,
# bound to 0.0.0.0 so it's reachable from the host through the container's
# port mapping. Survives after this script's shell exits.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$APP_DIR/.run"
PID_FILE="$RUN_DIR/dev-server.pid"
LOG_FILE="$RUN_DIR/dev-server.log"
PORT="${PORT:-3000}"

mkdir -p "$RUN_DIR"

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start() {
  if is_running; then
    echo "Already running (pid $(cat "$PID_FILE")). Use 'restart' to reload."
    exit 0
  fi
  # Belt-and-suspenders: a prior run's process tree can outlive its pidfile
  # (e.g. this script got killed before writing it), so free the port first.
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  cd "$APP_DIR"
  # New session/process-group leader so stop() can kill the whole tree
  # (npm -> next dev -> next-server) via the negative PID, not just npm itself.
  setsid nohup npm run dev -- -H 0.0.0.0 -p "$PORT" > "$LOG_FILE" 2>&1 &
  disown
  echo $! > "$PID_FILE"
  sleep 1
  if is_running; then
    echo "Started on http://0.0.0.0:$PORT (pid $(cat "$PID_FILE")). Logs: $LOG_FILE"
  else
    echo "Failed to start — check $LOG_FILE"
    exit 1
  fi
}

stop() {
  if ! is_running; then
    echo "Not running."
    rm -f "$PID_FILE"
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    exit 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  # Negative PID = whole process group (npm -> next dev -> next-server all
  # share it, since start() launched via setsid).
  kill -- "-$pid" 2>/dev/null || true
  sleep 1
  kill -9 -- "-$pid" 2>/dev/null || true
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "Stopped."
}

status() {
  if is_running; then
    echo "Running (pid $(cat "$PID_FILE")) on port $PORT."
  else
    echo "Not running."
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}"; exit 1 ;;
esac
