@echo off
title NeuroHub - rebuild
cd /d "%~dp0"
echo Rebuilding NeuroHub from source...
call npm run pack
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo.
echo Done. Now open the file:  !!! ZAPUSTIT NEUROHUB - OTKROY MENYA !!!.bat
pause
