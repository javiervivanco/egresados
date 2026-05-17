# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Vite + React 18 + Tailwind v3 SPA para comparar viajes de egresados. Spanish UI, ARS pricing. **Dos frontends** que comparten el mismo backend Supabase:

- `src/` — frontend público (familias). SPA actual: comparativa de cards, wizard, votación.
- `admin/` — admin SPA (super-admin + empresa-admin). Vite separado, mismo `VITE_SUPABASE_*`.

```
.
├── Makefile                      # frontend / supabase local / admin (ver "Common commands")
├── index.html                    # carga Montserrat desde Google Fonts (link tag)
├── package.json                  # React 18, Vite 5, Tailwind 3, lucide-react, @supabase/supabase-js
├── tailwind.config.js            # paleta forestal: pino, hojas, fogata, tierra, noche
├── vite.config.js                # host:true, port 5173
├── .env                          # prod  — VITE_SUPABASE_URL/ANON_KEY (gitignored)
├── .env.local                    # dev   — apunta a http://127.0.0.1:54321 (gitignored)
├── .env.example                  # template para arrancar local
├── api.txt                       # service-role key para migrate-to-supabase (gitignored)
├── supabase/
│   ├── config.toml               # config para `supabase start` (CLI)
│   ├── migrations/
│   │   └── 0001_init.sql         # schema fuente de verdad (escuelas, empresas, ...)
│   ├── functions/                # edge functions (vacío todavía; pipeline IA va acá)
│   ├── seed.sql                  # datos demo: super-admin + 2 empresas + 1 escuela
│   └── README.md                 # cómo levantar el stack local
├── scripts/
│   ├── extract-raw.mjs           # legacy viajes-corregido.jsx → src/data/viajes.json
│   ├── split-by-company.mjs      # viajes.json → un archivo por empresa
│   └── import-json-to-db.mjs     # JSON por empresa → empresas/destinos/planes_viaje (idempotente)
├── src/                          # frontend público
│   ├── App.jsx                   # UI entera: cards, wizard, votación, resultados
│   ├── supabase.js               # createClient si hay env vars, null si no
│   ├── lib/
│   │   ├── data.js               # loadPlanes(): DB con fallback a JSON locales
│   │   └── identity.js           # familia/familiaId/grupoId en localStorage
│   ├── components/
│   │   ├── IdentityGate.jsx
│   │   ├── MeetingDateVoting.jsx
│   │   ├── Messaging.jsx
│   │   └── VentaCerrada.jsx
│   └── data/<slug>.json          # fallback offline — fuente real ahora es DB
├── admin/                        # admin SPA Refine + AntD (Vite, port 5174)
│   ├── package.json              # @refinedev/{core,antd,supabase,react-router} + antd 6
│   ├── vite.config.js            # envDir apunta a la raíz para compartir .env*
│   └── src/
│       ├── App.jsx               # <Refine> + <ConfigProvider> + Routes
│       ├── resources.js          # 14 resources + agrupadores virtuales
│       ├── lib/supabaseClient.js
│       ├── providers/{authProvider,accessControlProvider}.js
│       ├── theme/antdTheme.js    # tokens paleta forestal
│       ├── contexts/EmpresaContext.jsx
│       ├── components/{Header,Title,EmpresaSwitcher,NavigateByRole,EstadoTag}
│       ├── utils/{formatters,estados}.js
│       └── pages/<resource>/{list,create,edit,show}.jsx
├── admin-legacy/                 # admin viejo Tailwind+hand-rolled, queda como referencia
└── viajes-corregido.jsx          # legacy original, input de make extract
```

## Common commands

```bash
# Frontend público
make dev         # vite :5173
make build       # production build → dist/
make preview     # build + serve dist :4173

# Supabase local (docker via CLI npx)
make up          # supabase start (corre migrations + seed)
make down        # supabase stop
make db-reset    # destruye y recrea DB local desde migrations/ + seed
make studio      # abre Studio en :54323
make status      # imprime URLs y keys locales

# Admin SPA
make admin-dev   # vite :5174 (admin/)
make admin-build

# Dataset
make data           # extract + split (legacy: jsx → JSON por empresa)
make data-import    # JSON → empresas/destinos/planes_viaje en la DB (idempotente)
```

`make up` la primera vez baja ~10 imágenes docker (~5min). Defaults locales y cuentas demo en `supabase/README.md`. No hay test suite ni linter configurado.

### Editing the dataset

Un archivo JSON por empresa en `src/data/<slug>.json`. Array plano de filas. `App.jsx` carga todo via `import.meta.glob("./data/*.json", { eager: true })` y concatena — agregar empresa nueva = drop `<slug>.json` y entrada en `COMPANY_ACCENT`.

`src/data/viajes.json` **no** se commitea: artefacto intermedio de `make extract`. El glob loader lo excluye explícitamente.

`make split` **skip** archivos existentes — así sobreviven ediciones manuales. Para forzar regen de uno, borralo primero.

`viajes-corregido.jsx` en raíz **no** está en el build — solo input de `make extract`.

## Architecture (todo en `src/App.jsx`, ~1700 líneas)

1. **`rawRows`** (estado en `App`) se carga via `loadPlanes()` en `lib/data.js`. Source of truth: DB (`planes_viaje + destinos + empresas`). **Fallback**: si Supabase no responde o la query devuelve 0 filas, cae a los JSON en `src/data/*.json`. `loadPlanes` siempre devuelve filas en formato legacy PascalCase (`Empresa`, `Destino`, `Transporte`, `Dias`, `Noches`, `Plan_Pago`, `Cantidad_Cuotas`, `Inscripcion`, `Reserva`, `Primera_Cuota`, `Cuota_Mensual`, `Anticipo_Saldo`, `Total_Final`, `Liberados`, `Seguro`, `Descuentos`, `Actividades`, `Vigencia`) **+ `id_db` y `destino_id`** cuando vienen de DB — usados por QuickVote para escribir a `votos_plan`. Campos de dinero / cuotas pueden faltar.

2. **`DESTINO_ALIAS`** normaliza variantes de un mismo lugar (ej: "Carlos Paz", "Córdoba", "Villa Carlos Paz / Córdoba" → "Carlos Paz / Córdoba") al cargar `RAW`. Si una empresa nueva trae un alias no listado, agregalo acá — no edites los JSON.

3. **`PROVINCIA_BY_DESTINO`** + `PROVINCIA_ORDER` agrupan cards por provincia en la vista "Por destino". Córdoba primero (destino más popular).

4. **`COMPANY_ACCENT`** — paleta Tailwind por empresa (`bg`, `border`, `text`, `dot`, `ring`, `chip`). **Agregar `Empresa` nueva al JSON sin entrada acá → la card cae al fallback ámbar de Flecha.** Mantener en sync. Los tokens (`pino`, `hojas`, `fogata`, `tierra`, `noche`) están definidos en `tailwind.config.js`, no son colores hardcoded.

5. **Agrupación de cards** — `App.groupedDestinations` agrupa por `${Empresa}|||${Destino}|||${Transporte}`. Si una empresa ofrece el mismo destino en bus *y* avión, son **cards separadas** (si no, el bus quedaría escondido en el select de avión).

6. **`fmt`** + **`getPaymentTip`** — helpers de formato. `getPaymentTip` bucketea planes por `Cantidad_Cuotas` (`1`, `null`, `≤5`, `≤12`, else) en copy castellano.

7. **`Tooltip`** + **`GLOSARIO`** — tooltips por término (cuotaMensual, alFirmar, inscripcion, etc). El `GuideBanner` muestra el glosario completo desplegado.

8. **`DestinationCard`** — corazón de la UI. Recibe `{ empresa, destino, planes }`. Deriva duraciones únicas `Dias|Noches`, expone `<select>` de `Plan_Pago`, corre la **Calculadora de Pagos** (ver abajo), resalta el `Total_Final` mínimo *dentro de la duración actual*, y embebe `QuickVote` (votar esta opción como 1ra/2da/3ra prioridad).

9. **`WizardView`** — flujo paso a paso por defecto (`viewMode === "wizard"`): elegí duración → elegí destino → cards filtradas. Alternativas: `"grid"` (todas las cards), `"resultados"` (`VotingResults`).

10. **`QuickVote`** — 4 pasos (nombre / prioridad 1-2-3 / plan de pago / confirmar). Inserta siempre en `votos` (legacy, fuente de `VotingResults`) y, si la fila tiene `id_db` y la familia se identificó vía `IdentityGate` (`familiaId` presente), **también** hace `upsert` en `votos_plan` con conflict en `(familia_id, prioridad)`. Falla silently si `supabase === null`.

11. **`VotingResults`** — lee todos los votos y arma agregados: por destino (ponderado por prioridad), por empresa-destino, por plan de pago, por rango de total / cuota, etc.

12. **`App`** — gate de identificación (modal pidiendo `familia`, persiste en `localStorage["egresados_familia"]`), tabs (`precio` / `provincia` / `empresa`), view switcher, stats strip, render de cards.

## Supabase

Schema **fuente de verdad** en `supabase/migrations/0001_init.sql`. La CLI lo aplica automáticamente al ejecutar `make up` / `make db-reset`. `scripts/schema.sql` es la versión legacy (mantenida solo para referencia del estado pre-multi-tenancy).

### Modelo de dominio

Dos pilares:

1. **Clientes** (jerarquía de familias):
   `escuelas → grupos (por año/grado) → familias → alumnos`. Las familias se registran eligiendo escuela + grado; el `grupo` es la unidad de decisión colectiva.

2. **Oferta** (jerarquía de empresas):
   `empresas → destinos → planes_viaje → documentos`. Cada documento dispara (en el futuro) un pipeline de extracción IA — hoy hay un mock client-side que transiciona `procesado_estado` después de 2s y guarda `datos_extraidos` con datos fake.

Tabla `profiles` une `auth.users` con su rol (`super_admin` | `empresa_admin` | `familia`) y entidad relacionada (`empresa_id` o `familia_id`).

### Flujo de votación (en dos etapas)

1. `fechas_reunion` (propuestas por la empresa) + `votos_fecha` (familias aceptan/rechazan) → 1ra elección: cuándo se hace la reunión presencial/virtual.
2. `votos_plan` (1/2/3 prioridades por familia) → 2da elección tras la reunión, lo que el frontend público actual ya hace.

### Mensajería empresa ↔ grupo

Tabla `mensajes` (migration 0002) — un hilo por par `(grupo_id, empresa_id)`. Campos: `autor_rol` (`empresa`|`familia`), `autor_nombre`, `contenido`, `leido_empresa`/`leido_grupo` (para badges de no-leídos en cada lado).

Componentes: `src/components/Messaging.jsx` (lado familias, junto a `MeetingDateVoting`) y `admin/src/components/AdminMessaging.jsx` (lado empresa, en `EmpresaAdmin`). Cada uno computa los hilos visibles uniendo `distinct empresa_id/grupo_id` de `fechas_reunion` y `mensajes` — un hilo "existe" si la empresa propuso fecha o si ya hubo conversación.

RLS:
- `SELECT`: super_admin, empresa_admin de esa empresa, o familia del grupo (via `current_familia_in_grupo()`).
- `INSERT`: validado con check sobre `autor_rol` + helper de rol (empresa_admin debe coincidir con `empresa_id`, familia con `grupo_id`).
- `UPDATE`: solo flips de `leido_empresa`/`leido_grupo`. Contenido es inmutable por diseño (audit trail).

### Ventas y comisiones

Tabla `ventas` (migration 0003) modela el cierre de un viaje empresa↔grupo. Campos clave:

- `monto_total = cantidad_pasajeros * precio_unitario` (generated column).
- `comision_monto = monto_total * comision_pct / 100` (generated column).
- `comision_pct` se setea via trigger desde `empresas.comision_pct_default` (default 8%) si no se pasa explícito.
- Estados (`venta_estado` enum): `borrador → confirmada → pagada → liquidada` + `cancelada`. Transiciones estampan timestamps (`confirmada_at`, `pagada_at`, etc) via trigger.
- **Unique active**: `unique index` parcial sobre `grupo_id` cuando `estado in ('confirmada','pagada','liquidada')` — impide que el mismo grupo aparezca cerrado con dos empresas. Borradores pueden coexistir (negociaciones paralelas).

RLS:
- `SELECT`: super_admin, empresa_admin dueña, o familia del grupo.
- `INSERT` y `UPDATE` mientras `estado in ('borrador','confirmada')`: empresa_admin de la empresa.
- `UPDATE` a `pagada`/`liquidada`: **solo super_admin** (la empresa no marca sus propias comisiones como cobradas).
- `DELETE`: super_admin.

Componentes: `admin/src/components/VentasSection.jsx` (CRUD del lado empresa), `admin/src/components/SuperVentas.jsx` (dashboard agregado + acciones pagada/liquidada del super), `src/components/VentaCerrada.jsx` (banner de confirmación visible para las familias del grupo).

### RLS

Cada tabla tiene RLS habilitado. Helpers SQL en la migration: `is_super_admin()`, `is_empresa_admin(empresa_id)`, `current_familia_id()`. Catálogos públicos (escuelas, empresas, destinos, planes_viaje) son lectura anon; mutaciones requieren el rol correcto. Documentos en Storage van al bucket privado `documentos`.

### Cliente

- `src/supabase.js` — **graceful fallback a `null`** si faltan env vars. Toda llamada en App.jsx checkea `if (!supabase) return`.
- `admin/src/lib/supabase.js` — **throw** si faltan envs. Admin no tiene fallback porque sin DB no hay nada que mostrar.

### Tablas legacy

`votos` sigue siendo la fuente de `VotingResults` (agregados por nombre libre de familia). En paralelo, `votos_plan` recibe los mismos votos cuando hay `familiaId` + `plan_id`. Eventual migración: `VotingResults` lee de `votos_plan` joined con `familias → grupos → escuelas`, y `votos` se deprecia.

`planes` (mirror JSON flat) **ya no se usa** desde el frontend — `lib/data.js` lee `planes_viaje + destinos + empresas`. Queda en la migration por compatibilidad pero no se inserta nada nuevo.

`scripts/import-json-to-db.mjs` carga los JSON al modelo normalizado (`empresas/destinos/planes_viaje`). Idempotente: upsert por slug en empresas, por `(empresa_id, nombre)` en destinos, y reemplaza los planes de cada destino. Requiere `SUPABASE_SECRET_KEY` en `.env.local`.

## Design system del frontend público (shadcn/ui + theming por CSS vars)

El frontend público usa **shadcn/ui** (primitivos copy-paste en `src/components/ui/`) sobre Tailwind v3 con tokens semánticos via CSS variables. Theming runtime: el visitante o el equipo de marketing pueden cambiar la paleta sin redeploy via `?theme=<nombre>` en la URL.

### Tokens (CSS vars HSL)

Definidos en `src/index.css`:

| Token | Forest (default) | Uso |
|---|---|---|
| `--primary` | `110 41% 25%` (pino) | CTAs principales, badges activos, foco |
| `--secondary` | `138 21% 65%` (hojas) | Backgrounds suaves, secondary buttons |
| `--accent` | `28 87% 67%` (fogata) | Highlights, "más económico", warnings suaves |
| `--destructive` | `11 76% 62%` (tierra) | Errores, alerts críticas, badges no-leído |
| `--foreground` | `198 36% 24%` (noche) | Texto principal |
| `--muted` / `--muted-foreground` | stone-50 / noche-mid | Backgrounds neutros, texto secundario |
| `--border` / `--input` / `--ring` | derivados | Bordes y foco |
| `--radius` | `0.75rem` | Radios consistentes (lg/md/sm derivados) |

`tailwind.config.js` consume las vars con `colors: { primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" }, ... }`. **No usar** colores hardcoded (`bg-amber-500`, `bg-pino`, etc) — siempre tokens semánticos.

### Themes alternativos

`[data-theme="ocean"]` y `[data-theme="sunset"]` overrides en `src/index.css`. El switching es 100% CSS — el tema se setea en `<html data-theme="X">` por `src/components/ThemeProvider.jsx`.

**Cómo cambiar el tema:**
- `?theme=ocean` o `?theme=sunset` en URL → marketing arma links de campaña (A/B testing sin redeploy).
- `?theme=default` o `?theme=reset` vuelve al base.
- La elección persiste en `localStorage["egresados_theme"]`.
- `VITE_DEFAULT_THEME=ocean` define el base por deploy.

Sumar un theme nuevo: agregar bloque `[data-theme="X"] { --primary: ...; }` en `index.css` y nombre en `THEMES` array de `src/lib/theme.js`.

### Componentes shadcn instalados (`src/components/ui/`)

button, card, dialog, input, textarea, label, form (react-hook-form), select, tabs, badge, tooltip, popover, sheet, alert, progress, skeleton, separator, scroll-area, command, toggle-group, sonner (toasts), collapsible. 22 primitivos vendoreados, no son dependencias npm — se modifican si hace falta.

### Forms

Stack: **react-hook-form + zod + @hookform/resolvers**. Patrón estándar shadcn (`Form`, `FormField`, `FormItem`, `FormControl`, `FormMessage`). Ver `OnboardingFunnel.jsx` y `ReportarCorreccion.jsx` como referencia.

### Tipografía

Montserrat via `<link>` en `index.html` para `font-sans` (única familia). El énfasis se hace con `italic` explícito (la clase `font-serif` ya no existe — antes apuntaba al mismo Montserrat).

## Identidad y autenticación de familias

- `IdentityGate` corre flujo en 3 pasos: escuela → grupo → apellido (+ email). Persiste `nombre`/`familiaId`/`grupoId` en localStorage via `lib/identity.js`.
- Tras crear/encontrar la fila en `familias`, hace **`supabase.auth.signInAnonymously()`** y upsert en `profiles` con `{ rol: "familia", familia_id }`. Esto permite que las RLS usen `current_familia_id()` y `current_familia_in_grupo()` sin necesidad de email/password.
- `supabase.auth.signInAnonymously` requiere `enable_anonymous_sign_ins = true` en `config.toml` (ya activado).
- El botón "Cambiar" hace `signOut()` además de `clearIdentity()` — sin eso el JWT viejo seguiría apuntando al `profile` viejo.
- Caveat: la sesión anónima vive en localStorage. Si el user limpia browser data, pierde el vínculo entre user anónimo y `familia_id`. La próxima `IdentityGate` crea otro user anónimo y upserta otro profile con el mismo `familia_id`. Está bien — `profiles.user_id` es unique pero un mismo `familia_id` puede tener varios `user_id` históricos.
- Fallback graceful (sin DB): `IdentityGate` cae al modal legacy con string libre cuando no hay escuelas cargadas o supabase no responde.

## The payment calculator (read this before touching pricing logic)

`DestinationCard` implementa descomposición de pasos de pago. Tres formas reales de plan codificadas; los comentarios inline en `App.jsx` son source of truth — preservalos al editar:

- **Inscripción + Primera Cuota distinta** (patrón Flecha): ambos cuentan *dentro* de `Cantidad_Cuotas` anunciada, mensuales restantes = `N − 2`.
- **Primera Cuota distinta sin Inscripción**: Primera Cuota cuenta dentro de N → restantes = `N − 1`.
- **Inscripción solamente** (Super Tour, Recrear, Lake Travel): las `N` cuotas son todas mensuales completas.

`hasPrimeraCuotaDistinta` dispara los primeros dos branches y se define como `Primera_Cuota > 0 && Cuota_Mensual && Primera_Cuota !== Cuota_Mensual` — Primera Cuota igual a la mensual se trata como primer mes normal, *no* upfront especial. Modelá empresas nuevas con planes raros extendiendo este bloque, no rociando condicionales más abajo.

El `upfront` en pantalla es `Inscripcion + Reserva + (hasPrimeraCuotaDistinta ? Primera_Cuota : 0)`. `Anticipo_Saldo` se renderiza como paso *separado* — no se pliega en upfront — porque las planillas originales lo presentan como suma pre-viaje independiente de las cuotas.

## Editing conventions

- Todos los strings visibles y las claves JSON están en español — mantenelas en español; no traduzcas claves al agregar filas. Voseo argentino en `getPaymentTip` y `GuideBanner` es intencional.
- Valores monetarios en JSON son enteros ARS planos (sin decimales, sin separador de miles). El formato pasa solo en render via `fmt` (`Number.toLocaleString("es-AR")`). No pre-formatees strings en data.
- `Actividades` es un string único separado por comas; `DestinationCard` lo splittea y trimea. Mantené ese contrato — no pases algunas filas a arrays.
- Tailwind arbitrary values (`text-[12.5px]`, `tracking-[0.22em]`) son intencionales — no los reemplaces por clases preset sin chequear el render.
- Empresas, destinos y planes nuevos se cargan **desde el admin SPA** (escriben directo a `destinos/planes_viaje`). Los JSON en `src/data/` son fallback offline; para refrescarlos desde el dataset histórico legacy correr `make data` y después `make data-import` los empuja a DB.

## Admin SPA (`admin/`) — Refine + Ant Design

Vite separado en port `5174`, comparte `.env*` con el frontend público vía `envDir`. **Reemplaza al admin legacy hand-rolled** (`admin-legacy/`, queda como referencia, no se buildea).

Stack:
- `@refinedev/core` + `@refinedev/antd` + `@refinedev/supabase` + `@refinedev/react-router`
- `antd` v6 + `@ant-design/icons` v6
- `react-router` v7

Resources (14 + agrupadores virtuales) definidos en `src/resources.js`. Cada `name` matchea exactamente el nombre de la tabla en Supabase; el data provider construye queries via PostgREST.

### Auth y permisos

- `src/providers/authProvider.js` — `signInWithPassword` + fetch `profiles` + cache en módulo. `getIdentity` y `getPermissions` exponen `{ rol, empresa_id, empresa_nombre }`. Usuarios sin profile o con rol `familia` no pueden entrar.
- `src/providers/accessControlProvider.js` — matriz declarativa `PERMS[rol][resource] = { list, show, create, edit, delete }`. Refine filtra el sidebar automáticamente; la RLS hace cumplir igual del lado server.
- `super_admin` ve todo (sidebar con secciones gobierno/oferta/interacción/comercio), opera "como" cualquier empresa vía `EmpresaSwitcher` en el header.
- `empresa_admin` ve solo oferta/interacción/ventas/correcciones de su empresa.

### Patrones clave

- **Cálculos en vivo (`ventas/create+edit`)**: `Form.useWatch` para reactividad; cascada destino → plan que auto-llena `precio_unitario`. Generated columns (`monto_total`, `comision_monto`) **no** se incluyen en `<Form.Item name>` y se filtran en `onFinish` para no romper PostgREST.
- **Expandable anidado (`escuelas/list`, `destinos/list`)**: `<Table expandable>` con `expandedRowRender` que monta tabla nested con Modal-based forms para CRUD de hijos. Destinos usa `<Tabs>` para alternar planes/documentos.
- **`profiles` con PK uuid**: cada hook (`useTable`, `useForm`, `EditButton`) recibe `meta: { idColumnName: "user_id" }`. Los nuevos admins se crean **fuera de la UI** con `make admin-create-user EMAIL=... ROL=...`.
- **Mock IA en `documentos/create` y `DocumentosNested`**: post-upload a Supabase Storage + insert en `documentos`, después `runMockIA` dispara dos `useUpdate` async transitionando `pendiente → procesando → procesado` con `datos_extraidos` fake. Edge function real va a vivir en `supabase/functions/procesar-documento/`.
- **`mensajes/index`**: 100% custom — no usa `<List>/<Table>`. Layout 2 paneles con lista de hilos (unión client-side de `fechas_reunion ∪ mensajes` distintos por `grupo_id`) y conversación. `useUpdateMany` para marcar leídos al abrir.
- **Theme**: `src/theme/antdTheme.js` con `ConfigProvider` tokens en paleta forestal (`colorPrimary: #2D5A27`/pino, `colorWarning: #F4A261`/fogata, `colorError: #E76F51`/tierra, `colorTextBase: #264653`/noche, `fontFamily: Montserrat`). `locale={esES}` para textos default de AntD.

### Vars de entorno

El SPA lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde `.env.local` en la raíz. **Si el shell del usuario exporta esas vars**, ganan sobre `.env.local`. El `Makefile` prefija `env -u VITE_SUPABASE_URL -u VITE_SUPABASE_ANON_KEY` en `dev`/`build`/`admin-dev`/`admin-build` para neutralizar eso.

## Edge Functions (futuro)

`supabase/functions/procesar-documento/` va a ser el handler que:
1. Se dispare via webhook al `insert` en `documentos`.
2. Descargue el archivo del bucket `documentos`.
3. Lo procese con LLM/OCR.
4. Persista la salida en `datos_extraidos` (jsonb) y transicione `procesado_estado`.

Por ahora **no existe** — el mock en `EmpresaAdmin.jsx` ocupa su rol.

## Operativo / scripts

- `make admin-create-user EMAIL=... ROL=super_admin|empresa_admin [PASSWORD=...] [NOMBRE=...] [EMPRESA_SLUG=...]` — crea un user en Auth + identity + profile vinculado. Idempotente: si el email ya existe resetea password y profile. Requiere `SUPABASE_SECRET_KEY` en `.env.local`.

## Estado del flujo de negocio

El producto modela un funnel de 4 etapas atravesando el cliente (escuela/grupo/familia) y la oferta (empresa/destino/plan):

1. **Discovery** — frontend público muestra cards de planes (DB-driven). Familias se identifican vía `IdentityGate` (escuela → grupo → apellido) y autentican con anon sign-in.
2. **Etapa 1 votación: fechas** — la empresa propone fechas de reunión al grupo (admin `FechasReunionSection`), las familias votan sí/no (`MeetingDateVoting`).
3. **Etapa 2 votación: planes** — tras la reunión, las familias rankean planes (`QuickVote` → `votos_plan`). Empresa y familias intercambian info via mensajería (`Messaging`/`AdminMessaging`).
4. **Cierre** — la empresa carga la venta confirmada (`VentasSection`). El grupo ve el banner `VentaCerrada`. El super-admin audita comisiones y marca pagada/liquidada (`SuperVentas`).
