@echo off
title DLA Mobile - :8082
chcp 65001 >nul
cd /d "%~dp0mobile"

echo Iniciando app movil en http://localhost:8082
echo.
npx expo start --web --port 8082

pause
