@echo off
title DLA Backend - :8888
chcp 65001 >nul
cd /d "%~dp0backend"

:: Activar entorno virtual
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Entorno virtual no encontrado. Ejecute setup.bat primero.
    pause
    exit /b 1
)

echo Iniciando backend en http://localhost:8888
echo Documentacion: http://localhost:8888/docs
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8888 --reload

pause
