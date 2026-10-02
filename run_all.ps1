Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   PRAYAS 3.0: Accessible Job Application Assistant Launcher    " -ForegroundColor Cyan
Write-Host "   Team ByteShastra - Problem Statement PS003                   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Checking and freeing ports 8000 and 3000 if occupied..." -ForegroundColor DarkGray
Get-NetTCPConnection -LocalPort 8000, 3000 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "▶ Starting Member 2: FastAPI Backend Server on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\prayas-backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "▶ Starting Member 1: Next.js Web Application on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\member_1'; npm run dev"

Start-Sleep -Seconds 4

Write-Host "▶ Launching default browser to PRAYAS Web App..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host " ✔ ALL SERVICES RUNNING:" -ForegroundColor Green
Write-Host "   • Web App:         http://localhost:3000"
Write-Host "   • Demo Portal:     http://localhost:3000/demo/job-application.html"
Write-Host "   • Pitch Console:   http://localhost:3000/demo/presentation-mode.html"
Write-Host "   • FastAPI Docs:    http://127.0.0.1:8000/docs"
Write-Host "   • Extension:       Folder 'member-3-prayas-extension' in chrome://extensions"
Write-Host "================================================================" -ForegroundColor Green
