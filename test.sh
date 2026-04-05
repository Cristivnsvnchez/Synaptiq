#!/bin/bash
# test.sh — Lance la suite de tests Synaptiq
# Usage: ./test.sh [--clean]
# --clean : supprime les entités de test créées

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧠 Synaptiq — Tests automatiques${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Vérifier que l'API tourne
echo -e "\n${YELLOW}1. Vérification API...${NC}"
if ! curl -sf http://localhost:8000/api/v1/domains/ > /dev/null 2>&1; then
  echo -e "${RED}✗ API non accessible sur localhost:8000${NC}"
  echo -e "  Lance d'abord : ${YELLOW}./start.sh${NC}"
  exit 1
fi
echo -e "${GREEN}✓ API accessible${NC}"

# 2. Activer le venv
echo -e "\n${YELLOW}2. Environnement Python...${NC}"
source venv/bin/activate

# 3. Installer dépendances de test si besoin
if ! python -c "import pytest, httpx" 2>/dev/null; then
  echo "  Installation de pytest + httpx..."
  pip install pytest httpx --quiet
fi
echo -e "${GREEN}✓ Dépendances OK${NC}"

# 4. Lancer pytest
echo -e "\n${YELLOW}3. Lancement des tests...${NC}\n"
PYTHONPATH=src python -m pytest tests/test_api.py \
  -v \
  --tb=short \
  --no-header \
  -q \
  "$@"

STATUS=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $STATUS -eq 0 ]; then
  echo -e "${GREEN}✅ Tous les tests passent${NC}"
else
  echo -e "${RED}❌ Des tests ont échoué — voir ci-dessus${NC}"
fi

# 5. Nettoyage des entités [auto] si --clean
if [[ "$*" == *"--clean"* ]]; then
  echo -e "\n${YELLOW}Nettoyage des entités de test...${NC}"
  python -c "
import httpx, sys
with httpx.Client(base_url='http://localhost:8000/api/v1', timeout=10) as c:
    entities = c.get('/entities/').json()
    deleted = 0
    for e in entities:
        if '[auto]' in (e.get('name') or ''):
            c.delete(f'/entities/{e[\"id\"]}')
            deleted += 1
    print(f'  {deleted} entités de test supprimées')
"
fi

exit $STATUS
