@echo off
title Application Intelligence Platform
echo Starting Application Intelligence Platform...
start "Backend Server (FastAPI)" cmd /k "call "%~dp0start_backend.bat""
start "Frontend Server (Vite)" cmd /k "call "%~dp0start_frontend.bat""
echo Started Backend and Frontend in separate external CMD windows.
