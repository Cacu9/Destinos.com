@echo off
rem Levanta Destinos.com: backend (Django) y frontend (Vite), y abre el navegador.
rem La primera vez también instala las dependencias.
chcp 65001 >nul
cd /d "%~dp0"

if not exist backend\.venv (
  echo Instalando el backend por primera vez...
  python -m venv backend\.venv || goto :error
  backend\.venv\Scripts\python -m pip install -q -r backend\requirements.txt || goto :error
)

if not exist backend\.env (
  copy backend\.env.example backend\.env >nul
  echo.
  echo Se creo backend\.env. Revisa DATABASE_URL antes de seguir:
  echo   PostgreSQL: postgres://USUARIO:CONTRASENA@localhost:5432/destinos
  echo   Sin PostgreSQL: sqlite:///db.sqlite3
  notepad backend\.env
)

rem Las migraciones se corren desde backend, igual que el servidor, para usar la misma base.
pushd backend
.venv\Scripts\python manage.py migrate -v 0 || goto :error
popd
rem Datos de demostracion (no se duplican si ya existen).

if not exist frontend\node_modules (
  echo Instalando el frontend por primera vez...
  pushd frontend
  call npm install || goto :error
  popd
)

start "Destinos - backend" cmd /k "cd backend && .venv\Scripts\python manage.py runserver"
start "Destinos - frontend" cmd /k "cd frontend && npm run dev"
timeout /t 5 >nul
start http://localhost:5173
exit /b 0

:error
echo.
echo Algo fallo. Revisa el mensaje de arriba.
pause
exit /b 1
