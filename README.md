# Destinos.com

Agencia de viajes online (trabajo práctico de Desarrollo de Software). Los precios, vuelos y pagos son de demostración.

| Capa          | Tecnología                                         |
| ------------- | -------------------------------------------------- |
| Backend       | Django 5 + Django REST Framework + JWT (SimpleJWT) |
| Base de datos | PostgreSQL (SQLite opcional para desarrollo)       |
| Frontend      | React 19 + TypeScript + Vite + Tailwind CSS 4      |

## Historias de usuario

### Sprint

| Historia | Quién | Pantalla | API |
| -------- | ----- | -------- | --- |
| UC1 · Registrar cuenta | Visitante | `/registro` | `POST /api/auth/register/` |
| UC2 · Iniciar sesión | Cliente / administrador | `/ingresar` | `POST /api/auth/login/` |
| UC3 · Cerrar sesión | Cliente / administrador | Menú del sitio y del panel | `POST /api/auth/logout/` |
| UC4 · Consultar catálogo de vuelos | Visitante / cliente | `/vuelos` | `GET /api/flights/` |
| UC24 · Gestionar cuentas de administrador | Administración General | `/admin/cuentas` | `/api/admin/accounts/` |
| UC27 · Actualizar precios | Catálogo y Precios | `/admin/precios` | `PATCH /api/admin/fares/<id>/`, `/api/admin/flights/<id>/`, `/api/admin/accommodations/<id>/` |
| UC28 · Actualizar destinos | Catálogo y Precios | `/admin/destinos` | `/api/admin/destinations/` |
| UC30 · Configurar políticas de cancelación | Catálogo y Precios | `/admin/politicas` | `PUT /api/admin/flights/<id>/policy/` |

### Extra (fuera del sprint)

| Historia | Quién | Pantalla | API |
| -------- | ----- | -------- | --- |
| UC5 · Consultar catálogo de alojamientos | Visitante / cliente | `/alojamientos` | `GET /api/accommodations/` |
| Gestión de alojamientos (alta, edición, baja y reactivación) | Catálogo y Precios | `/admin/alojamientos` | `/api/admin/accommodations/` |

### Qué cubre cada historia

- **UC1 · Registrar cuenta**: nombre, apellido, correo válido y contraseña obligatorios; valida que el correo no esté registrado (y avisa si tiene ñ o tildes); informa "Usuario registrado con éxito" o los datos incorrectos.
- **UC2 · Iniciar sesión**: ingreso con correo y contraseña; cada administrador entra solo a las funciones de su área; si los datos no coinciden informa "No corresponde a un usuario existente".
- **UC3 · Cerrar sesión**: cierra la sesión (invalida el token) e informa "Cerrando Sesión".
- **UC4 · Consultar catálogo de vuelos**:
  - Filtros opcionales: tipo de vuelo (solo ida, ida y vuelta, multidestino), origen, destino, categoría, fecha y pasajeros (mayores y menores).
  - Cada vuelo muestra aerolínea, tramos, escalas, duración, tarifa, precio en ARS y USD y resumen de cancelación.
  - Ordena por precio, duración o escalas, de menor a mayor o al revés. Sin resultados informa "No se encontraron resultados para los filtros seleccionados".
  - **Mapa de rutas**: al pasar el mouse o enfocar un pasaje se dibuja su ruta (ver más abajo).
- **UC24 · Gestionar cuentas de administrador**: alta, modificación y baja con nombre, apellido, correo y área obligatorios; la baja pide confirmación y es lógica (se puede reactivar).
- **UC27 · Actualizar precios**: se elige el catálogo (Vuelos o Alojamientos) y el servicio (cada tarifa por clase, el precio base del vuelo o la noche de un alojamiento); el precio debe ser numérico y mayor a cero, con su divisa (ARS o USD); informa "Precio actualizado con éxito" o el error.
- **UC28 · Actualizar destinos**: ciudad, provincia o estado, país y aeropuerto (código IATA) obligatorios; latitud y longitud opcionales para ubicarlo en el mapa; la baja pide confirmación; informa "Destino actualizado con éxito" o el error.
- **UC30 · Configurar políticas de cancelación**:
  - Cada vuelo es **no reembolsable** o tiene **tramos** (cancelando con al menos X horas o días antes de la salida se retiene un % de 0 a 100).
  - Valida que los plazos sean coherentes: no se repiten y, cuanto más cerca de la salida, la penalización no baja.
  - Muestra una vista previa de cómo la ve el viajero y aclara que los cambios aplican a compras nuevas.
- **UC5 · Consultar catálogo de alojamientos** (extra): búsqueda por destino, tipo, huéspedes y estrellas, con valoración, precio por noche y resumen de cancelación.

Cada administrador pertenece a un área (**Administración General**, **Catálogo y Precios** u **Operador de Reservas**) y solo accede a las funciones de su área, en el panel y en la API. Administración General y Catálogo y Precios gestionan destinos, vuelos, precios, políticas y alojamientos; las cuentas de administrador son solo de Administración General.

## Cómo levantarlo

### Rápido (Windows)

Doble clic en `iniciar.bat`. La primera vez instala las dependencias; después migra la base, carga los usuarios y los vuelos de demostración, levanta backend y frontend y abre el navegador.

### Manual

Requisitos: Python 3.12+, Node 20+ y PostgreSQL (o SQLite para probar rápido).

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (en macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            # completar DJANGO_SECRET_KEY y DATABASE_URL
python manage.py migrate
python manage.py cargar_usuarios  # un administrador por área y un cliente
python manage.py cargar_vuelos    # 27 destinos con coordenadas y 23 vuelos de demostración
python manage.py runserver
```

Para PostgreSQL: crear la base (`createdb destinos`) y usar `DATABASE_URL=postgres://USUARIO:CONTRASEÑA@localhost:5432/destinos`. Sin PostgreSQL: `DATABASE_URL=sqlite:///db.sqlite3`.

`cargar_vuelos` no duplica vuelos si se corre de nuevo; con `--reiniciar` los borra y los vuelve a crear con fechas desde hoy.

**Frontend**

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

## Vuelos de demostración

`cargar_vuelos` crea 23 vuelos con fechas a partir de hoy:

- **Solo ida**: nacionales (Bariloche, Mendoza, Salta, Ushuaia, Iguazú, El Calafate) e internacionales (Santiago, San Pablo, Miami, Londres, Madrid, París, Lima).
- **Ida y vuelta**: Mendoza, Bariloche, Miami, Madrid y Punta Cana.
- **Multidestino**: AEP → COR → MDZ, AEP → IGR → SLA → AEP, EZE → GRU → MIA, EZE → MAD → BCN y EZE → FCO → CDG → LHR.
- Precios en **ARS** y **USD**, varias clases de cabina y tres tipos de política: flexible, estándar (con penalizaciones) y no reembolsable.

## Detalles del catálogo de vuelos

- **Tramos**: el primer tramo vive en el vuelo (`Vuelo`) y los siguientes en `TramoVuelo` (la vuelta, o cada destino siguiente de un multidestino). En multidestino, buscar por destino encuentra cualquiera de las ciudades del viaje.
- **Escalas y destinos**: una *escala* es una parada técnica dentro de un tramo (se informa la cantidad). En un *multidestino* el viajero se queda en cada ciudad y cada una es un tramo con fecha propia.
- **Duración y escalas para ordenar**: se usa el total del itinerario. La duración es la suma de los minutos en el aire de todos los tramos, sin contar la espera entre ellos; las escalas también se suman por tramo.
- **Mapa de rutas** (`frontend/src/features/mapa`):
  - Está en `/vuelos` y en la portada. Al pasar el mouse o enfocar un pasaje se dibuja su ruta.
  - Cada tramo tiene su color: ida en rojo, vuelta o 2.º destino en azul, 3.º en verde y 4.º en ocre (el mismo color se ve en la tarjeta).
  - Se arrastra para moverlo, la rueda o los botones acercan y alejan, y tiene pantalla completa. Solo marca los aeropuertos del vuelo elegido.
- **Coordenadas**: cada destino guarda latitud y longitud. Si el código IATA es conocido (`backend/catalog/aeropuertos.py`) se completan solas; si no, se cargan en el formulario del destino.
- **Precios en dos divisas**: cada precio se muestra en su divisa y convertido a la otra, redondeado hacia arriba al entero. La cotización de referencia (US$ 1 = $ 1.450) está en `frontend/src/lib/divisas.ts`.
- **Llegada al día siguiente**: si un tramo llega otro día, la tarjeta lo indica ("llega al día siguiente").

## Comandos útiles

```bash
cd backend && python manage.py test     # tests de la API
cd frontend && npm test                 # tests de la búsqueda de vuelos
cd frontend && npm run typecheck        # tipos
cd frontend && npm run lint             # lint
cd frontend && npm run build            # build de producción
```

## Idioma del código

El código está escrito en español: clases, funciones, variables, componentes, archivos y comentarios. Algunos nombres quedan en inglés a propósito, porque cambiarlos modificaría la base de datos, la API o el funcionamiento del framework:

- **Lo que exige Django, DRF o React**: `Meta`, `fields`, `get_queryset`, `validate`, `create_user`, `className`, `children`, etc.
- **Campos de la base y de la API**: `email`, `first_name`, `last_name`, `role`, `admin_area`, `is_active`, `password`, `trip_type`, `legs`, `cancellation_rules`, etc.
- **Valores guardados**: `client`, `admin`, `general`, `catalog`, `reservations`, `one_way`, `round_trip`, `multi_city` (en el código se usan con nombres en español, por ejemplo `Rol.CLIENTE` o `TipoViaje.MULTI_CITY`).
- **Rutas de la API**: `/api/auth/register/`, `/api/flights/`, `/api/admin/flights/<id>/policy/`, etc.
- **La app de Django `accounts` y el modelo `User`**: renombrarlos cambia los nombres de las tablas.
- **El componente del mapa** (`MapaRutas.tsx`, `useMapView.ts`) conserva nombres internos en inglés de su versión original; lo que expone al resto del sitio está en español.

## Estructura

Cada historia vive en sus propios archivos, así cada cambio queda asociado a su UC:

```
backend/
  config/                              settings y rutas
  accounts/api/registro.py             UC1
  accounts/api/sesion.py               UC2 (ingreso, usuario actual) · accounts/permisos.py (áreas)
  accounts/api/cierre_sesion.py        UC3
  accounts/api/cuentas_admin.py        UC24
  accounts/campos.py                   validación de correo y contraseña (UC1 y UC24)
  catalog/models.py                    Vuelo, TramoVuelo, TarifaVuelo, TramoPolitica, Destino, Alojamiento
  catalog/api/vuelos_publicos.py       UC4 · catalog/filtros.py (filtros de búsqueda)
  catalog/api/vuelos_admin.py          gestión de vuelos y tramos · UC30 (acción policy)
  catalog/api/tarifas_admin.py         tarifas por clase (UC27)
  catalog/api/destinos.py              UC28
  catalog/politicas.py                 UC30 (validación y resumen de la política)
  catalog/api/alojamientos.py          UC5 y gestión de alojamientos (extra)
  catalog/aeropuertos.py               aeropuertos conocidos con coordenadas
  catalog/management/commands/         cargar_vuelos (datos de demostración)
frontend/src/
  app/ components/ lib/ paginas/       base compartida (lib/divisas.ts: conversión ARS/USD)
  paginas/RutasDestacadas.tsx          portada: rutas del catálogo con mapa
  features/registro/                   UC1
  features/sesion/                     UC2 y UC3 (ingreso, cierre de sesión, panel por área)
  features/busqueda-vuelos/            UC4
  features/mapa/                       mapa de rutas (UC4)
  features/cuentas-admin/              UC24
  features/precios-admin/              UC27
  features/destinos-admin/             UC28
  features/politicas-admin/            UC30
  features/vuelos-admin/               gestión de vuelos, tramos y tarifas
  features/alojamientos/               UC5 (extra)
  features/alojamientos-admin/         gestión de alojamientos (extra)
```
