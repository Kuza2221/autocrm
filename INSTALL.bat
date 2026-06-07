@echo off
title AutoCRM - Installing dependencies
echo ==========================================
echo   AutoCRM - Installing dependencies
echo ==========================================
echo.

echo [1/2] Installing server dependencies...
cd /d %~dp0server
call npm install
if %errorlevel% neq 0 (
  echo ERROR: Failed to install server dependencies
  pause
  exit /b 1
)

echo.
echo [2/2] Installing client dependencies...
cd /d %~dp0client
call npm install
if %errorlevel% neq 0 (
  echo ERROR: Failed to install client dependencies
  pause
  exit /b 1
)

echo.
echo ==========================================
echo   Installation complete!
echo   Run START.bat to launch AutoCRM
echo ==========================================
pause
