@echo off
title Backend Server (FastAPI / Uvicorn)
cd /d C:\Users\vikil\Desktop\Project_Evalution\backend
echo ===================================================
echo Starting Application Intelligence Backend Server...
echo ===================================================
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
