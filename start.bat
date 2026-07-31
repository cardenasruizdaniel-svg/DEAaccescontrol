@echo off
title DLA Access Enterprise
chcp 65001 >nul
cd /d "%~dp0"

echo =============================================
echo  DLA Access Enterprise - Inicio Rapido
echo =============================================
echo.
echo Iniciando servicios...
echo.

:: Iniciar backend en ventana separada
start "DLA Backend" cmd /c "cd /d %~dp0backend && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8888 --reload) else (echo Ejecute setup.bat primero & pause)"

:: Esperar 5 segundos
timeout /t 5 /nobreak >nul

:: Iniciar frontend en ventana separada
start "DLA Frontend" cmd /c "cd /d %~dp0frontend && npx next dev --port 3000"

:: Iniciar mobile en ventana separada (opcional)
start "DLA Mobile" cmd /c "cd /d %~dp0mobile && npx expo start --web --port 8082"

echo.
echo =============================================
echo  Servicios iniciados
echo =============================================
echo.
echo  Backend:  http://localhost:8888
echo  Frontend: http://localhost:3000
echo  Mobile:   http://localhost:8082
echo.
echo  Credenciales: admin@dlaredes.com.co / Admin123!
echo.
pause
