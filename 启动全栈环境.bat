@echo off
chcp 65001 >nul
title GWC Full Stack
color 0B
setlocal

set "GWC_ROOT=%~dp0"
cd /d "%GWC_ROOT%"

echo =========================================
echo    GalGame Web Chat - Full Stack Engine
echo =========================================
echo.
echo Working dir: %CD%
echo.

echo [0] Checking OpenCode...
where opencode >nul 2>nul
if errorlevel 1 (
    echo     OpenCode not found, installing...
    call npm install -g opencode-ai
    if errorlevel 1 (
        echo [WARN] OpenCode install failed, continuing without it.
    ) else (
        echo     OpenCode installed.
    )
) else (
    echo     OpenCode OK.
)

echo [1] Checking Python environment...
if not exist "backend\runtime\python.exe" (
    echo [ERROR] Python runtime not found!
    pause
    exit /b 1
)
echo     Python runtime OK.

echo [1] Installing Python dependencies...
cd backend
.\runtime\python.exe -m pip install -r requirements.txt --disable-pip-version-check
cd "%GWC_ROOT%"
echo     Dependencies done.

echo [2] Starting Backend (port 5201)...
start "GWC AI Backend" cmd /k "cd /d "%GWC_ROOT%backend" && .\runtime\python.exe main.py && echo. && echo [Backend stopped] && pause"

echo [3] Waiting 5s for backend...
timeout /t 5 /nobreak >nul

echo [4] Starting DeskPet (Electron)...
start "GWC DeskPet" cmd /k "cd /d "%GWC_ROOT%electron-app" && node_modules\electron\dist\electron.exe . && echo. && echo [DeskPet stopped] && pause"

echo [5] Starting OpenCode...
where opencode >nul 2>nul
if errorlevel 1 (
    echo     OpenCode not installed, skipping.
) else (
    start "GWC OpenCode" cmd /k "cd /d "%GWC_ROOT%" && opencode && echo. && echo [OpenCode stopped] && pause"
)

echo [6] Starting Frontend...
cd /d "%GWC_ROOT%frontend"

if exist "dist\index.html" (
    echo     Frontend served by backend at http://127.0.0.1:5201/app
    echo     No separate frontend process needed.
    goto :done
)

echo     No pre-built frontend found, trying Node.js dev server...
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js not installed!
    echo    Download: https://nodejs.org/
    echo    Backend and tray are still running.
    echo    Admin panel: http://127.0.0.1:5201/admin
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo     Installing Node.js dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [WARN] npm install failed, retrying with --force...
        call npm install --force
    )
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
)

npm run dev

:done
echo.
echo [INFO] All services running.
echo     Frontend: http://127.0.0.1:5201/app
echo     Admin:    http://127.0.0.1:5201/admin
echo.
pause
