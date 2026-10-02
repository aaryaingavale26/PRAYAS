@echo off
title PRAYAS 3.0 Launcher - Team ByteShastra
echo ================================================================
echo    PRAYAS 3.0: Accessible Job Application Assistant Launcher
echo    Team ByteShastra - Problem Statement PS003
echo ================================================================
echo.

cd /d "%~dp0"

echo Freeing ports 8000 and 3000 if occupied...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

echo [1/3] Starting Member 2: FastAPI Backend Server on port 8000...
start "PRAYAS 3.0 - FastAPI Backend (Port 8000)" cmd /k "cd prayas-backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Member 1: Next.js Web App on port 3000...
start "PRAYAS 3.0 - Next.js Web App (Port 3000)" cmd /k "cd member_1 && npm run dev"

timeout /t 4 /nobreak >nul

echo [3/3] Opening PRAYAS 3.0 in default web browser...
start http://localhost:3000

echo.
echo ================================================================
echo  SERVICES READY:
echo    - Web Application:       http://localhost:3000
echo    - Interactive Demo:      http://localhost:3000/demo/job-application.html
echo    - Pitch Console:         http://localhost:3000/demo/presentation-mode.html
echo    - Backend API Docs:      http://127.0.0.1:8000/docs
echo.
echo  CHROME EXTENSION:
echo    Load the folder "member-3-prayas-extension" into chrome://extensions
echo ================================================================
pause
