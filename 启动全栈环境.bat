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
findstr /I /C:"\"disableOpencodeAutostart\": true" "userdata\launcher_config.json" >nul 2>nul
if not errorlevel 1 goto opencode_skip

where opencode >nul 2>nul
if errorlevel 1 goto opencode_install
echo     OpenCode OK.
goto opencode_done

:opencode_install
echo     OpenCode not found, installing...
call npm install -g opencode-ai
if errorlevel 1 (
    echo [WARN] OpenCode install failed, continuing without it.
)
goto opencode_done

:opencode_skip
echo     OpenCode autostart disabled in settings, skipping.

:opencode_done
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

echo [2] Checking Electron apps...
where node >nul 2>nul
if errorlevel 1 goto node_missing

if not exist "console-app\node_modules" goto install_console
goto check_desktop

:install_console
echo     Installing console-app Electron...
pushd console-app
call npm install
popd

:check_desktop
if not exist "desktop-app\node_modules" goto install_desktop
goto check_pet

:install_desktop
echo     Installing desktop-app Electron...
pushd desktop-app
call npm install
popd

:check_pet
if not exist "electron-app\node_modules" goto install_pet
goto check_build

:install_pet
echo     Installing electron-app Electron...
pushd electron-app
call npm install
popd

:check_build
if not exist "frontend\dist\index.html" goto build_frontend
goto launch_console

:build_frontend
echo     Building frontend - first run...
pushd frontend
if not exist "node_modules" call npm install --legacy-peer-deps
call npm run build
popd

:launch_console
echo [3] Launching GWC Console - all services in one window...
start "GWC Console" /D "%GWC_ROOT%console-app" node_modules\electron\dist\electron.exe .
goto done

:node_missing
echo [WARN] Node.js not installed, console cannot start.
pause
goto done

:done
echo.
echo [INFO] GWC Console is managing all services.
echo     Backend:  http://127.0.0.1:5201
echo     Frontend: Electron - http://127.0.0.1:5202/app
echo     Admin:    http://127.0.0.1:5201/admin
echo.
exit /b 0
