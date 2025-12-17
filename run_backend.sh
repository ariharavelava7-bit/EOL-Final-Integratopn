#!/bin/bash
echo "Starting L&T CORe Backend..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8001

