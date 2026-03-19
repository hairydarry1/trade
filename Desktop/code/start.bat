@echo off
title DevToolkit Server
cd /d "%~dp0"
echo Starting DevToolkit server on http://localhost:8080
echo Opening browser...
powershell -Command "Start-Process 'http://localhost:8080'"
echo.
echo Press any key to stop the server...
pause >nul
