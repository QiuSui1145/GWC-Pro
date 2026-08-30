@echo off
chcp 65001 >nul
title GWC Built-in TTS (GPT-SoVITS)
setlocal

rem ==========================================================
rem GWC built-in TTS launcher.
rem Inference code + models live here under tts\ ; the heavy Python
rem runtime is SHARED from the original GPT-SoVITS install to save ~6.6GB.
rem Override with:  set GWC_SOVITS_RUNTIME=D:\path\to\runtime\python.exe
rem NOTE: keep this file CRLF + ASCII, cmd.exe misparses LF batch files.
rem ==========================================================

set "TTS_ROOT=%~dp0"
set "SERVER_DIR=%TTS_ROOT%server"

if not defined GWC_SOVITS_RUNTIME (
    set "GWC_SOVITS_RUNTIME=D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604\runtime\python.exe"
)

if not exist "%GWC_SOVITS_RUNTIME%" (
    echo [ERROR] Python runtime not found:
    echo         %GWC_SOVITS_RUNTIME%
    echo.
    echo The built-in TTS shares the runtime from the original GPT-SoVITS install.
    echo Set GWC_SOVITS_RUNTIME to your runtime\python.exe if it lives elsewhere.
    echo.
    pause
    exit /b 1
)

if not exist "%SERVER_DIR%\api_v2.py" (
    echo [ERROR] TTS server files missing: %SERVER_DIR%\api_v2.py
    pause
    exit /b 1
)

echo =========================================
echo    GWC Built-in TTS  (port 9880)
echo =========================================
echo Runtime: %GWC_SOVITS_RUNTIME%
echo Server : %SERVER_DIR%
echo.

cd /d "%SERVER_DIR%"
"%GWC_SOVITS_RUNTIME%" api_v2.py -a 127.0.0.1 -p 9880 -c GPT_SoVITS/configs/tts_infer.yaml

echo.
echo [TTS stopped]
pause
