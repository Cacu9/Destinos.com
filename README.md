# Destinos.com

Agencia de viajes online (trabajo práctico de Desarrollo de Software). Los precios, vuelos y pagos son de demostración.

| Capa          | Tecnología                                         |
| ------------- | -------------------------------------------------- |
| Backend       | Django 5 + Django REST Framework + JWT (SimpleJWT) |
| Base de datos | PostgreSQL (SQLite opcional para desarrollo)       |
| Frontend      | React 19 + TypeScript + Vite + Tailwind CSS 4      |

## Historias del sprint

| Historia | Pantalla | API |
| -------- | -------- | --- |
| UC1 · Registrar cuenta | `/registro` | `POST /api/auth/register/` |
| UC2 · Iniciar sesión | `/ingresar` | `POST /api/auth/login/` |
| UC3 · Cerrar sesión | Menú del sitio y del panel | `POST /api/auth/logout/` |
| UC24 · Gestionar cuentas de administrador | `/admin/cuentas` | `/api/admin/accounts/` |

Cada administrador pertenece a un área (**Administración General**, **Catálogo y Precios** u **Operador de Reservas**) y solo accede a las funciones de su área, en el panel y en la API.

## Cómo levantarlo

Requisitos: Python 3.12+, Node 20+ y PostgreSQL (o SQLite para probar rápido).

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (en macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            # completar DJANGO_SECRET_KEY y DATABASE_URL
python manage.py migrate
python manage.py cargar_usuarios  # un administrador por área y un cliente
python manage.py runserver
```

Para PostgreSQL: crear la base (`createdb destinos`) y usar `DATABASE_URL=postgres://USUARIO:CONTRASEÑA@localhost:5432/destinos`. Sin PostgreSQL: `DATABASE_URL=sqlite:///db.sqlite3`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173. Vite redirige `/api` al backend en el puerto 8000.

## Usuarios de prueba

Contraseña de todos: `Destinos2026!`

| Correo                  | Rol                    |
| ----------------------- | ---------------------- |
| `admin@destinos.com`    | Administración General |
| `catalogo@destinos.com` | Catálogo y Precios     |
| `reservas@destinos.com` | Operador de Reservas   |
| `cliente@destinos.com`  | Cliente                |

## Comandos útiles

```bash
cd backend && python manage.py test     # tests de la API
cd frontend && npm run typecheck        # tipos
cd frontend && npm run lint             # lint
cd frontend && npm run build            # build de producción
```

## Idioma del código

El código está escrito en español: clases, funciones, variables, componentes, archivos y comentarios. Algunos nombres quedan en inglés a propósito, porque cambiarlos modificaría la base de datos, la API o el funcionamiento del framework:

- **Lo que exige Django, DRF o React**: `Meta`, `fields`, `get_queryset`, `validate`, `create_user`, `className`, `children`, etc.
- **Campos de la base y de la API**: `email`, `first_name`, `last_name`, `role`, `admin_area`, `is_active`, `password`.
- **Valores guardados**: `client`, `admin`, `general`, `catalog`, `reservations` (en el código se usan con nombres en español, por ejemplo `Rol.CLIENTE` o `AreaAdmin.CATALOGO`).
- **Rutas de la API**: `/api/auth/register/`, `/api/auth/login/`, `/api/auth/logout/`, `/api/admin/accounts/`, etc.
- **La app de Django `accounts` y el modelo `User`**: renombrarlos cambia los nombres de las tablas.

## Estructura

Cada historia vive en sus propios archivos, así cada cambio queda asociado a su UC:

```
backend/
  config/                  settings y rutas
  accounts/api/registro.py       UC1
  accounts/api/sesion.py         UC2 (ingreso, usuario actual) · accounts/permisos.py (áreas)
  accounts/api/cierre_sesion.py  UC3
  accounts/api/cuentas_admin.py  UC24
frontend/src/
  app/ components/ lib/ paginas/  base compartida
  features/registro/              UC1
  features/sesion/                UC2 y UC3 (ingreso, cierre de sesión, panel por área)
  features/cuentas-admin/         UC24
```
