@echo off
echo Starting L^&T CORe Backend...

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
echo Backend will be available at http://localhost:8001
echo API docs will be available at http://localhost:8001/docs
echo.
REM Run via `python -m uvicorn` so it always uses the venv-installed uvicorn
python -m uvicorn app:app --host 0.0.0.0 --port 8001
pause

