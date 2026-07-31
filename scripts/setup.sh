#!/bin/bash
echo "==========================================="
echo "  DLA Access Enterprise - Setup Script"
echo "  DLA Redes y Seguridad"
echo "==========================================="

echo ""
echo "[1/5] Creating virtual environment..."
cd backend
python -m venv venv
source venv/bin/activate 2>/dev/null || venv\Scripts\activate

echo "[2/5] Installing dependencies..."
pip install -e ".[dev]"

echo "[3/5] Starting database..."
cd ..
docker compose -f docker-compose.dev.yml up -d

echo "[4/5] Running migrations..."
sleep 5
cd backend
alembic upgrade head

echo "[5/5] Setup complete!"
echo ""
echo "To start development:"
echo "  Backend:  cd backend && uvicorn app.main:app --reload --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "API Docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:3000"
