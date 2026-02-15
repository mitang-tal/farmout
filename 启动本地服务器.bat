@echo off
cd /d "%~dp0"

set "PORT=8765"
set "URL=http://localhost:%PORT%"

echo.
echo ========================================
echo   FarmCalc - Local Server
echo ========================================
echo.
echo Browser will open in 5 seconds. Keep THIS window open.
echo.

start /b cmd /c "timeout /t 5 /nobreak >nul && start "" "%URL%""

:: Use PowerShell first (built-in on Windows, no Python/Node needed)
where powershell >nul 2>&1
if %errorlevel% equ 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port %PORT%
    goto :end
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    py -m http.server %PORT%
    goto :end
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server %PORT%
    goto :end
)

where npx >nul 2>&1
if %errorlevel% equ 0 (
    npx --yes serve -l %PORT%
    goto :end
)

echo [Error] Could not start server. Install Python or use Cursor Live Server.
pause
exit /b 1

:end
pause
