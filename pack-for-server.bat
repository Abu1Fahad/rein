@echo off
rem Makes rein1v1-server.zip with everything the server needs (code + database), without node_modules or .env.
cd /d "%~dp0"
title Pack REIN 1V1 for the server

echo Stopping the local site so the database is copied safely...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1
timeout /t 2 >nul

echo.
echo  [1] First upload  - code + database (players, tournaments, settings)
echo  [2] Update        - code only (the server keeps its own database)
choice /c 12 /n /m "Choose 1 or 2: "
set MODE=%errorlevel%

if exist rein1v1-server.zip del rein1v1-server.zip
if "%MODE%"=="1" (
  tar -a -c -f rein1v1-server.zip --exclude=node_modules --exclude=.env --exclude=.claude --exclude=.git --exclude=start.log --exclude=*.zip --exclude=backup-before-*.db --exclude=backups .
) else (
  tar -a -c -f rein1v1-server.zip --exclude=node_modules --exclude=.env --exclude=.claude --exclude=.git --exclude=start.log --exclude=*.zip --exclude=data .
)
if errorlevel 1 (
  echo.
  echo Packing failed.
  pause
  exit /b 1
)

echo.
echo Done: %cd%\rein1v1-server.zip
echo Upload it to the server and follow deploy\DEPLOY.md
echo (Do not run the site on this PC and on the server at the same time - the Discord bot would run twice.)
echo.
pause
