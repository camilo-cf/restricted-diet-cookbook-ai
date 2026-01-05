#!/bin/bash
set -e

COMMAND=$1

case $COMMAND in
  dev)
    echo "Starting development environment..."
    docker compose up -d --build
    echo "Services started. Logs: 'docker compose logs -f'"
    ;;
  
  gen:client)
    echo "Generating API client..."
    pnpm gen:client
    ;;
    
  migrate)
    echo "Running DB migrations..."
    docker compose exec backend alembic upgrade head
    ;;
    
  db:reset)
    echo "Resetting database..."
    docker compose down -v
    docker compose up -d db minio
    echo "Waiting for DB to be healthy..."
    sleep 5
    docker compose up -d backend
    echo "Waiting for backend to be ready..."
    sleep 5
    docker compose exec backend alembic upgrade head
    echo "Database reset complete."
    ;;

  test)
    echo "Running Backend Tests..."
    # Local run for speed if possible, else docker exec
    if [ -d "apps/api/.venv" ] || [ -f "apps/api/requirements.txt" ]; then
        cd apps/api && PYTHONPATH=. pytest
        cd ../..
    else
        docker compose exec backend pytest
    fi

    echo "Running Frontend Tests..."
    cd apps/web && pnpm test
    ;;

  smoke)
    echo "🔥 Running Smoke Tests..."
    
    echo "1. Validating Client..."
    pnpm client:check
    
    echo "2. Checking Frontend Build..."
    cd apps/web && pnpm build && cd ../..
    
    echo "3. Checking Backend Boot..."
    docker compose build backend
    docker compose up -d db backend
    
    echo "Waiting for backend health..."
    timeout=30
    while [ $timeout -gt 0 ]; do
      if curl -s http://localhost:8000/health | grep "ok" > /dev/null; then
        echo "✅ Backend Healthy"
        break
      fi
      sleep 1
      timeout=$((timeout - 1))
    done
    
    if [ $timeout -eq 0 ]; then
      echo "❌ Backend failed to boot"
      docker compose logs backend
      exit 1
    fi
    
    echo "✅ Smoke Tests Passed"
    ;;

  check)
    echo "Running checks..."
    pnpm client:check
    cd apps/api && PYTHONPATH=. alembic check
    cd ../web && pnpm lint
    ;;

  *)
    echo "Usage: ./run.sh [dev|gen:client|migrate|db:reset|test|check]"
    exit 1
    ;;
esac
