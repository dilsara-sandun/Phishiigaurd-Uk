# PhishGuard UK — Backend Startup Script
# Run this from the phishguard-uk root: .\start-backend.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PhishGuard UK — Backend Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendDir = Join-Path $PSScriptRoot "backend"
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
$venvUvicorn = Join-Path $backendDir "venv\Scripts\uvicorn.exe"

# Verify venv exists
if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] Virtual environment not found at: $backendDir\venv" -ForegroundColor Red
    Write-Host "  Please create it by running:" -ForegroundColor Yellow
    Write-Host "    cd backend" -ForegroundColor Yellow
    Write-Host "    python -m venv venv" -ForegroundColor Yellow
    Write-Host "    .\venv\Scripts\activate" -ForegroundColor Yellow
    Write-Host "    pip install -r ..\requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Virtual environment found" -ForegroundColor Green

# Change to backend directory and start
Set-Location $backendDir
Write-Host "[INFO] Starting FastAPI on http://localhost:8000 ..." -ForegroundColor Cyan
Write-Host "[INFO] Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

& $venvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
