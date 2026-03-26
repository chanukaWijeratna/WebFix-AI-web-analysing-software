@echo off
set "ROOT=%~dp0"

echo === WebFix AI Setup ===
echo.

:: Create Python virtual environment
echo [1/4] Creating Python virtual environment...
python -m venv "%ROOT%venv"
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment. Make sure Python is installed.
    pause
    exit /b 1
)
echo Done.

:: Install Python dependencies
echo.
echo [2/4] Installing Python packages from requirements.txt...
call "%ROOT%venv\Scripts\pip.exe" install -r "%ROOT%requirements.txt"
if errorlevel 1 (
    echo ERROR: Failed to install Python packages.
    pause
    exit /b 1
)
echo Done.

:: Install frontend Node dependencies
echo.
echo [3/4] Installing frontend Node packages...
call npm install --prefix "%ROOT%"
if errorlevel 1 (
    echo ERROR: Failed to install frontend Node packages.
    pause
    exit /b 1
)
echo Done.

:: Install webscraper Node dependencies
echo.
echo [4/4] Installing webscraper Node packages...
call npm install --prefix "%ROOT%webscraper"
if errorlevel 1 (
    echo ERROR: Failed to install webscraper Node packages.
    pause
    exit /b 1
)
echo Done.

echo.
echo === Setup complete! Run start.bat to launch the app. ===
pause
