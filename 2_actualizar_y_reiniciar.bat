@echo off
setlocal enabledelayedexpansion
title Actualizar y Reiniciar - Tablero de Gestion de Agendas (Puerto 3003)

cd /d "%~dp0"

echo ====================================================================
echo    ACTUALIZAR Y REINICIAR TABLERO DESDE GITHUB (Puerto 3003)
echo ====================================================================
echo.

echo [1/4] Deteniendo cualquier proceso activo en el puerto 3003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003 ^| findstr LISTENING') do (
    echo Cerrando proceso PID %%a en puerto 3003...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo [2/4] Descargando ultimas modificaciones desde GitHub (git pull)...
git pull
if %errorlevel% neq 0 (
    echo [AVISO] Git pull reporto advertencias o conflictos.
)

echo.
echo [3/4] Comprobando e instalando dependencias (npm install)...
call npm install

echo.
echo [4/4] Iniciando la aplicacion en http://localhost:3003...
timeout /t 2 /nobreak >nul
start http://localhost:3003
call npm run dev:3003

pause
