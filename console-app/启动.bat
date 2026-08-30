@echo off
chcp 65001 >nul
title GWC Console
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing Electron...
    call npm install
)

start "GWC Console" /D "%~dp0" node_modules\electron\dist\electron.exe .
