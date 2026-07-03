@echo off
title GalGame Web Chat Starter

echo ========================================
echo   Welcome to GalGame Web Chat (GWC)
echo ========================================
echo.

:: Check if Node.js is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not detected!
    echo Please install Node.js from https://nodejs.org/ first.
    pause
    exit
)

:: Check if node_modules exists, if not, install dependencies
if not exist "node_modules\" (
    echo [INFO] First run detected. Installing dependencies automatically...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [WARN] npm install failed, retrying with --force...
        call npm install --force
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to install dependencies. Please check your network.
            pause
            exit
        )
    )
    echo [INFO] Dependencies installed successfully!
    echo.
)

echo [INFO] Starting local server...
call npm run dev

pause