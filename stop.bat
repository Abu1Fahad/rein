@echo off
rem Stops the REIN 1V1 site running on port 3000
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
  echo Stopping server (PID %%p^)...
  taskkill /F /PID %%p >nul 2>&1
)
echo Done.
timeout /t 2 >nul
