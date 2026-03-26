@echo off
set "ROOT=%~dp0"

start "WebFix Backend" powershell -NoExit -Command "& '%ROOT%venv\Scripts\Activate.ps1'; Set-Location '%ROOT%webscraper'; npm start"
start "WebFix Analysis" powershell -NoExit -Command "& '%ROOT%venv\Scripts\Activate.ps1'; Set-Location '%ROOT%analysis'; pip install -r requirements.txt; python insight_generator.py"
start "WebFix Frontend" powershell -NoExit -Command "& '%ROOT%venv\Scripts\Activate.ps1'; Set-Location '%ROOT%'; npm start"
