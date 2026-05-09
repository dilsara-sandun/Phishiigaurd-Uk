# ============================================================
# PhishGuard UK - TERMINAL 2
# Web Dashboard + Mail Assistant (Outlook Add-in)
# Run: .\start-frontend.ps1
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  PhishGuard UK - Web Dashboard + Mail Assistant" -ForegroundColor Magenta
Write-Host "  Web Dashboard:   http://localhost:5173" -ForegroundColor DarkMagenta
Write-Host "  Mail Assistant:  https://localhost:3000" -ForegroundColor DarkMagenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

$root = $PSScriptRoot
$frontendDir = Join-Path $root "frontend"
$mailDir = Join-Path $root "mail-assistant"

# ---- 1. Start Web Dashboard (port 5173) in background ----
Write-Host "[1/2] Starting Web Dashboard (frontend) on port 5173 ..." -ForegroundColor Yellow

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "  -> Installing frontend dependencies..." -ForegroundColor Gray
    Set-Location $frontendDir
    npm install | Out-Null
}

$dashboardJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $frontendDir

Write-Host "[OK] Web Dashboard starting in background (Job ID: $($dashboardJob.Id))" -ForegroundColor Green
Write-Host ""

# Give dashboard a moment to start
Start-Sleep -Seconds 3

# ---- 2. Start Mail Assistant (port 3000) in foreground ----
Write-Host "[2/2] Starting Mail Assistant (Outlook Add-in) on port 3000 ..." -ForegroundColor Yellow

if (-not (Test-Path (Join-Path $mailDir "node_modules"))) {
    Write-Host "  -> Installing mail-assistant dependencies..." -ForegroundColor Gray
    Set-Location $mailDir
    npm install | Out-Null
}

Set-Location $mailDir
Write-Host "[INFO] Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Web Dashboard -> http://localhost:5173" -ForegroundColor Green
Write-Host "  Mail Assistant -> https://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Browser Extension: Load 'extension/' folder in Chrome (developer mode)" -ForegroundColor DarkCyan
Write-Host ""

npm run dev
