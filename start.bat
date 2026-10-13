@echo off
rem Windows launcher: installs deps, creates .env on first run, restarts the bot if it crashes.
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

if not exist .env (
  call npm run setup
  echo.
  echo Edit the new .env file, then run start.bat again.
  pause
  exit /b
)

:loop
node index.js
echo Bot stopped. Restarting in 5 seconds... (close this window to quit)
timeout /t 5 /nobreak >nul
goto loop
