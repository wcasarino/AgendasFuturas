@echo off
setlocal enabledelayedexpansion
title Instalador Inicial - Tablero de Gestion de Agendas

:: ====================================================================
:: CONFIGURACION DE CARPETA Y REPOSITORIO GITHUB
:: Puedes cambiar la ruta de destino aqui si deseas otra carpeta:
:: ====================================================================
set "CARPETA_DESTINO=C:\Proyectos\tablero-turnos"

echo ====================================================================
echo    INSTALACION INICIAL DESDE GITHUB (Windows 11)
echo ====================================================================
echo.

:: 1. Verificar Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Git desde: https://git-scm.com/
    echo.
    pause
    exit /b 1
)

:: 2. Verificar Node.js
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm no esta instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js LTS desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Carpeta destino configurada: %CARPETA_DESTINO%
echo.
set /p REPO_URL="Ingresa la URL de tu repositorio GitHub (o presiona Enter si ya estas en la carpeta): "

if not "%REPO_URL%"=="" (
    echo.
    echo [1/4] Clonando repositorio en %CARPETA_DESTINO%...
    if not exist "%CARPETA_DESTINO%" mkdir "%CARPETA_DESTINO%"
    git clone %REPO_URL% "%CARPETA_DESTINO%"
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo clonar el repositorio. Verifica la URL.
        pause
        exit /b 1
    )
    cd /d "%CARPETA_DESTINO%"
) else (
    cd /d "%~dp0"
)

echo.
echo [2/4] Configurando archivo de variables de entorno (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Archivo .env generado correctamente a partir de .env.example.
    )
)

echo.
echo [3/4] Instalando dependencias del proyecto (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Ocurrio un error al ejecutar npm install.
    pause
    exit /b 1
)

echo.
echo [4/4] Instalacion completada!
echo Abriendo http://localhost:3003 en tu navegador e iniciando el servidor...
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3003
call npm run dev:3003

pause
