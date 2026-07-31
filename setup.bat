@echo off
title DLA Access Enterprise - Instalacion
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =============================================
echo  DLA Access Enterprise - Instalacion Local
echo =============================================
echo.

:: --- Verificar requisitos ---
echo [1/6] Verificando requisitos...

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python no encontrado. Instale Python 3.11+
    echo Descargar: https://www.python.org/downloads/
    pause
    exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no encontrado. Instale Node.js 20+
    echo Descargar: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set pyver=%%i
for /f "tokens=1" %%i in ('node --version') do set nodever=%%i
echo    Python: %pyver%
echo    Node:   %nodever%

:: --- Verificar PostgreSQL ---
echo.
echo [2/6] Verificando PostgreSQL...

where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    ADVERTENCIA: psql no encontrado en PATH.
    echo    Asegurese de que PostgreSQL 16 este instalado y en PATH.
    echo    Descargar: https://www.postgresql.org/download/
) else (
    echo    PostgreSQL detectado
)

:: --- Crear base de datos ---
echo.
echo [3/6] Creando base de datos PostgreSQL...
psql -U postgres -c "CREATE DATABASE dla_access_enterprise;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    Base de datos creada exitosamente
) else (
    echo    La base de datos ya existe o no se pudo crear
    echo    Si falla, ejecute manualmente: psql -U postgres -c "CREATE DATABASE dla_access_enterprise;"
)

:: --- Instalar backend ---
echo.
echo [4/6] Instalando backend (Python)...

cd /d "%~dp0backend"

if exist venv (
    echo    Usando entorno virtual existente...
) else (
    echo    Creando entorno virtual...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo    Instalando dependencias...
pip install -e ".[dev]" --quiet
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Fallo la instalacion del backend
    pause
    exit /b 1
)
echo    Backend instalado correctamente

:: --- Ejecutar migraciones ---
echo.
echo [5/6] Ejecutando migraciones de base de datos...
echo    NOTA: Si falla, asegurese que PostgreSQL este corriendo en localhost:5432
alembic upgrade head
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Fallaron las migraciones
    echo    Verifique que PostgreSQL este en ejecucion y la base de datos exista
    pause
    exit /b 1
)
echo    Migraciones ejecutadas correctamente

:: --- Sembrar datos iniciales ---
echo.
echo [5b/6] Sembrando datos iniciales...
python seed.py
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Fallo la siembra de datos
    pause
    exit /b 1
)
echo    Datos iniciales creados: empresa, roles, permisos y admin
echo    Credenciales: admin@dlaredes.com.co / Admin123!

deactivate

:: --- Instalar frontend ---
echo.
echo [6/6] Instalando frontend (Node.js)...

cd /d "%~dp0frontend"
echo    Instalando dependencias...
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Fallo la instalacion del frontend
    pause
    exit /b 1
)
echo    Frontend instalado correctamente

:: --- Instalar mobile ---
echo.
echo [6b/6] Instalando app movil (Expo)...

cd /d "%~dp0mobile"
echo    Instalando dependencias...
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Fallo la instalacion del movil
    pause
    exit /b 1
)
echo    App movil instalada correctamente

echo.
echo =============================================
echo  INSTALACION COMPLETADA EXITOSAMENTE
echo =============================================
echo.
echo Comandos para iniciar:
echo   start.bat              - Inicia todo (back, front, mobile)
echo   start-backend.bat      - Solo backend  (puerto 8888)
echo   start-frontend.bat     - Solo frontend (puerto 3000)
echo.
echo Credenciales por defecto:
echo   Email:    admin@dlaredes.com.co
echo   Password: Admin123!
echo.
echo URL:
echo   Backend:  http://localhost:8888/docs
echo   Frontend: http://localhost:3000
echo   Mobile:   http://localhost:8082
echo.
pause
