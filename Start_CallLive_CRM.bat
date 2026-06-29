@echo off
title CallLive AI CRM Launcher
color 0A

echo.
echo  ================================================
echo   CallLive AI CRM - Starting...
echo  ================================================
echo.

:: Change to the twenty directory
cd /d D:\twenty

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Docker is not running!
    echo  Please start Docker Desktop first, then run this again.
    echo.
    pause
    exit /b 1
)

echo  [1/2] Starting CRM containers...
docker compose up -d

echo.
echo  [2/2] Waiting for CRM to be ready...
timeout /t 5 /nobreak >nul

echo.
echo  ================================================
echo   CRM is Ready! Opening in browser...
echo  ================================================
echo.

:: Open browser
start "" "http://localhost:3000"

echo  CRM opened at: http://localhost:3000
echo.
echo  Login details:
echo  Email   : pintu@calllive.ai
echo  Password: (your password)
echo.
echo  You can close this window now.
echo.
pause
