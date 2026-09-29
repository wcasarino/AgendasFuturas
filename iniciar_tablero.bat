@echo off
title Tablero de Gestion de Agendas Futuras (Puerto 3003)
echo ====================================================================
echo   Iniciando Tablero de Gestion de Agendas en el puerto 3003...
echo   Direccion: http://localhost:3003
echo ====================================================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3003
npm run dev:3003
pause
