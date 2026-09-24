@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo  Deploying Sub Tools ^& Wasm to app.mdo3.com
echo  Target: /home/mdo3/mdo3.com/public_html/app
echo ========================================================

REM 1. Build WebAssembly
echo [1/3] Building WebAssembly binaries...
call npm run build:wasm
if %ERRORLEVEL% neq 0 (
    echo [ERROR] WebAssembly build failed.
    exit /b %ERRORLEVEL%
)

REM 2. Check SSH key & connection
echo [2/3] Checking SSH connection to XServer (mdo3@mdo3.xsrv.jp:10022)...
ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "echo Connected successfully" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] SSH connection failed. Please ensure ~/.ssh/config or keys are set.
    exit /b %ERRORLEVEL%
)

REM 3. Synchronize files using tar stream
echo [3/3] Synchronizing tools, assets, and wasm binaries...
tar -czf - tools css js wasm imag Version.js shosai-hub.html wrc-hub.html | ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "tar -xzf - -C /home/mdo3/mdo3.com/public_html/app"

if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo  Deploy to app.mdo3.com completed successfully!
    echo  URL: https://app.mdo3.com/tools/
    echo ========================================================
) else (
    echo [ERROR] Deployment failed with error code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

endlocal
