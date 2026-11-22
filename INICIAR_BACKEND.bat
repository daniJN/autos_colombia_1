@echo off
cd /d "%~dp0backend"
if not exist .venv (
  py -m venv .venv
  call .venv\Scripts\activate
  pip install -r requirements.txt
  copy .env.example .env
) else (
  call .venv\Scripts\activate
)
uvicorn app.main:app --reload
pause
