# ============================================================
# PhishGuard UK - TERMINAL 1
# Backend (FastAPI + ML Models)
# Run: .\start-backend.ps1
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PhishGuard UK - Backend + ML Engine" -ForegroundColor Cyan
Write-Host "  API: http://localhost:8000" -ForegroundColor DarkCyan
Write-Host "  Docs: http://localhost:8000/api/docs" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$backendDir = Join-Path $PSScriptRoot "backend"
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] venv not found at $backendDir\venv" -ForegroundColor Red
    Write-Host "  Run: cd backend; python -m venv venv; .\venv\Scripts\activate; pip install -r ..\requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Virtual environment found" -ForegroundColor Green
Set-Location $backendDir
Write-Host "[INFO] Starting FastAPI on port 8000 ..." -ForegroundColor Cyan
Write-Host "[INFO] Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

& $venvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
