@echo off
title AutoCRM
echo ==========================================
echo   AutoCRM - Auto Service Management
echo ==========================================
echo.

echo [1/2] Starting backend server...
start "AutoCRM Server" cmd /k "cd /d %~dp0server && node index.js"

timeout /t 2 /nobreak >nul

echo [2/2] Starting frontend...
start "AutoCRM Client" cmd /k "cd /d %~dp0client && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo ==========================================
echo   AutoCRM is running!
echo   Open: http://localhost:5173
echo   Login: admin@autocrm.com / admin123
echo ==========================================
echo.
start http://localhost:5173
pause
