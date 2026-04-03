#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ███████╗██╗   ██╗███╗   ██╗ █████╗ ██████╗ ████████╗██╗ ██████╗ "
echo "  ██╔════╝╚██╗ ██╔╝████╗  ██║██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗"
echo "  ███████╗ ╚████╔╝ ██╔██╗ ██║███████║██████╔╝   ██║   ██║██║   ██║"
echo "  ╚════██║  ╚██╔╝  ██║╚██╗██║██╔══██║██╔═══╝    ██║   ██║██║▄▄ ██║"
echo "  ███████║   ██║   ██║ ╚████║██║  ██║██║        ██║   ██║╚██████╔╝"
echo "  ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝        ╚═╝   ╚═╝ ╚══▀▀═╝ "
echo ""
echo "  Personal OS — démarrage en cours..."
echo ""

# Check PostgreSQL
if ! /opt/homebrew/opt/postgresql@16/bin/pg_isready -q 2>/dev/null; then
  echo "  ▶ Démarrage PostgreSQL..."
  brew services start postgresql@16 > /dev/null 2>&1
  sleep 2
fi
echo "  ✓ PostgreSQL"

# Start API
echo "  ▶ Démarrage API (port 8000)..."
cd "$ROOT/src"
source "$ROOT/venv/bin/activate"
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
API_PID=$!
sleep 2
echo "  ✓ API  →  http://localhost:8000/docs"

# Start Frontend
echo "  ▶ Démarrage Frontend (port 3000)..."
cd "$ROOT/frontend"
npm run dev --silent &
FRONT_PID=$!
sleep 3
echo "  ✓ Frontend  →  http://localhost:3000"

echo ""
echo "  Synaptiq est prêt. Ctrl+C pour tout arrêter."
echo ""

# Open browser
sleep 1
open http://localhost:3000

# Wait and cleanup on exit
trap "echo ''; echo '  Arrêt de Synaptiq...'; kill $API_PID $FRONT_PID 2>/dev/null; brew services stop postgresql@16 > /dev/null 2>&1; echo '  Bye.'; exit" SIGINT SIGTERM

wait
