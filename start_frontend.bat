@echo off
title Frontend Server (Vite / React)
cd /d "%~dp0frontend"
echo ===================================================
echo Starting Application Intelligence Frontend Server...
echo URL: http://localhost:5173
echo ===================================================
call npm run dev
pause
