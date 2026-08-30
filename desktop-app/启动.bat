@echo off
chcp 65001 >nul
title GWC Desktop
cd /d "%~dp0"

echo ============================================
echo   GWC 主界面桌面版 (Electron)
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] 未检测到 Node.js！
    echo 请先安装: https://nodejs.org/
    pause
    exit /b 1
)

rem 依赖安装
if not exist "node_modules\" (
    echo [1/2] 首次运行，正在安装 Electron...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Electron 安装失败，请检查网络。
        pause
        exit /b 1
    )
)

rem 前端构建
if not exist "..\frontend\dist\index.html" (
    echo [2/2] 未找到前端构建产物，正在构建...
    pushd ..\frontend
    if not exist "node_modules\" (
        call npm install --legacy-peer-deps
    )
    call npm run build
    set "BUILD_ERR=%errorlevel%"
    popd
    if not "%BUILD_ERR%"=="0" (
        echo [ERROR] 前端构建失败。
        pause
        exit /b 1
    )
)

echo.
echo [INFO] 请确保后端已在 127.0.0.1:5201 运行。
echo [INFO] 如未启动，请先双击项目根目录的「启动全栈环境.bat」。
echo.
echo [INFO] 正在启动 GWC 主界面...
echo.
call npm start
pause
