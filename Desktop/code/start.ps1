# DevToolkit - Quick Start Script
# Run this to start the local server

$port = 8080
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host " DevToolkit - Starting Server" -ForegroundColor Cyan
Write-Host " ==============================" -ForegroundColor Cyan
Write-Host ""

# Try Python first
try {
    Write-Host "Starting Python HTTP server on port $port..." -ForegroundColor Yellow
    $process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dir'; python -m http.server $port" -PassThru -WindowStyle Normal
    Start-Sleep 2
    if (!$process.HasExited) {
        Write-Host "Server running at: http://localhost:$port" -ForegroundColor Green
        Write-Host ""
        Write-Host "Opening browser..." -ForegroundColor Cyan
        Start-Process "http://localhost:$port"
        Write-Host ""
        Write-Host "Press Ctrl+C in the new window to stop the server" -ForegroundColor Gray
    }
} catch {
    Write-Host "Python not found. Trying alternative..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
