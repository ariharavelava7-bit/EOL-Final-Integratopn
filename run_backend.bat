@echo off
echo Starting FFF Validation Engine Backend...

REM Check if venv already exists
if exist "venv\Scripts\activate.bat" (
    echo Virtual environment found. Activating...
    call venv\Scripts\activate
) else (
    echo Creating new virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo Starting FastAPI server...
echo Backend will be available at http://localhost:8000
echo API docs will be available at http://localhost:8000/docs
echo.
python app.py
pause

