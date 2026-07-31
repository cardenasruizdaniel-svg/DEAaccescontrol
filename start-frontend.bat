@echo off
title DLA Frontend - :3000
chcp 65001 >nul
cd /d "%~dp0frontend"

echo Iniciando frontend en http://localhost:3000
echo.
npx next dev --port 3000

pause
