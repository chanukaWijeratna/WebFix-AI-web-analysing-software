@echo off
set "ROOT=%~dp0"

start "WebFix Backend" powershell -NoExit -Command "Set-Location '%ROOT%webscraper'; npm start"
start "WebFix Analysis" powershell -NoExit -Command "Set-Location '%ROOT%analysis'; pip install -r requirements.txt; python insight_generator.py"
start "WebFix Frontend" powershell -NoExit -Command "Set-Location '%ROOT%'; npm start"
