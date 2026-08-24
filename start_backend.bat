@echo off
title Backend Server (FastAPI / Uvicorn)
cd /d "%~dp0backend"
echo ===================================================
echo Starting Application Intelligence Backend Server...
echo URL: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo ===================================================
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
