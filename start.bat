@echo off
cd /d "%~dp0"
title REIN 1V1 server
echo ==== %date% %time% ==== > start.log

rem Stop any old copy of the site that is still running on port 3000
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
  echo Stopping old server (PID %%p^)...
  taskkill /F /PID %%p >nul 2>&1
)
timeout /t 1 >nul

where node >> start.log 2>&1
node -v >> start.log 2>&1
call npm -v >> start.log 2>&1
if not exist node_modules (
  echo Installing dependencies...
  call npm install >> start.log 2>&1
)
start "" cmd /c "timeout /t 5 >nul & start http://localhost:3000"
echo Starting REIN 1V1 on http://localhost:3000 ...
call npm start 2>&1
echo.
echo The server stopped.
pause
