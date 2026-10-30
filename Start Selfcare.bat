@echo off
title Selfcare - Expo
cd /d "%~dp0"

echo.
echo  ==============================================
echo    Selfcare: starting the app for Expo Go
echo  ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is not installed on this computer.
  echo.
  echo  1. Download the LTS version from https://nodejs.org
  echo  2. Install it, keeping the default options
  echo  3. Double-click "Start Selfcare.bat" again
  echo.
  pause
  exit /b 1
)

for /f "tokens=1 delims=v." %%v in ('node -v') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
  echo  Your Node.js is too old ^(version %NODE_MAJOR%^). Selfcare needs version 20 or newer.
  echo  Install the LTS version from https://nodejs.org, then run this again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo  First run: installing the app's packages. This takes a few minutes...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  The install did not finish. Check your internet connection and run this again.
    pause
    exit /b 1
  )
)

echo.
echo  Starting Expo. A QR code will appear below.
echo.
echo   - Android: open Expo Go and tap "Scan QR code"
echo   - iPhone:  open the Camera app and point it at the QR code
echo.
echo  Your phone must be on the same Wi-Fi as this computer.
echo  If Windows asks about network access for Node.js, click "Allow".
echo  Press  w  in this window to open the app in your browser too.
echo  Close this window to stop the app.
echo.
call npx expo start
pause
