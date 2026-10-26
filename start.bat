@echo off
title Smart Lost and Found Portal
echo ==========================================================
echo Starting Smart Lost and Found Management Portal...
echo ==========================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
