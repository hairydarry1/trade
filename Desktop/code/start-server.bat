@echo off
title DevToolkit Server
echo.
echo  DevToolkit - Starting Local Server
echo  ================================
echo.
echo  Opening in browser...
cd /d "%~dp0"
python -m http.server 8080 >nul 2>&1
if errorlevel 1 (
    echo  Python not found. Trying Node.js...
    npx serve . -p 8080
) else (
    start http://localhost:8080
)
echo.
echo  Press Ctrl+C to stop the server
pause
