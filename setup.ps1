Write-Host "🚀 Starting MoneyOS Setup..." -ForegroundColor Green

# Check Docker
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed. Please install Docker Desktop."
    exit 1
}

# 1. Create .env if not exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "Creating backend .env..."
    Copy-Item "backend\.env.example" "backend\.env" -ErrorAction SilentlyContinue
    if (-not (Test-Path "backend\.env")) {
        # Fallback if example doesn't exist
        Set-Content "backend\.env" "PROJECT_NAME=MoneyOS`nPOSTGRES_USER=postgres`nPOSTGRES_PASSWORD=postgres`nPOSTGRES_SERVER=db`nPOSTGRES_DB=wealth_sync`nDATABASE_URL=postgresql+asyncpg://postgres:postgres@db/wealth_sync`nBACKEND_CORS_ORIGINS=['http://localhost:3000','http://localhost:5173']"
    }
}

# 2. Start Services
Write-Host "🐳 Starting Docker containers..."
docker-compose up -d --build

# 3. Wait for DB
Write-Host "⏳ Waiting for Database..."
Start-Sleep -Seconds 10

# 4. Run Migrations
Write-Host "🔄 Running Database Migrations..."
docker-compose exec api alembic revision --autogenerate -m "Initial migration"
docker-compose exec api alembic upgrade head

# 5. Frontend Setup
Write-Host "📦 Installing Frontend Dependencies..."
Set-Location frontend
npm install
Set-Location ..

Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000/docs"
Write-Host "Frontend: Run cd frontend; npm run dev to start"
