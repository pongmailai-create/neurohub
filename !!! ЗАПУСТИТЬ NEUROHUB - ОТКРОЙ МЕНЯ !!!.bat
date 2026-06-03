@echo off
title NeuroHub
cd /d "%~dp0"

set "APP=%~dp0release\win-unpacked\NeuroHub.exe"

if exist "%APP%" (
  start "" "%APP%"
  exit /b 0
)

echo Building NeuroHub (one time, takes a couple of minutes)...
call npm run pack
if errorlevel 1 (
  echo Build failed. See the error above.
  pause
  exit /b 1
)
start "" "%APP%"
exit /b 0
