# PhishGuard UK — Mail Assistant Frontend Startup Script
# Run from phishguard-uk root: .\start-frontend.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  PhishGuard UK — Mail Assistant UI" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$frontendDir = Join-Path $PSScriptRoot "mail-assistant"

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "[INFO] node_modules not found. Running npm install first..." -ForegroundColor Yellow
    Set-Location $frontendDir
    npm install
}

Set-Location $frontendDir
Write-Host "[INFO] Starting Vite dev server on https://localhost:3000 ..." -ForegroundColor Cyan
Write-Host "[INFO] Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

npm run dev
