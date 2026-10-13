# Arquitectura C4 — Egresados

Diagramas C4 del sistema Egresados (marketplace de viajes de egresados),
mantenidos como fuente de verdad arquitectónica.

## Capas modeladas

| Capa | Archivo KDL | Archivo PUML | Render |
|---|---|---|---|
| **C1** — Contexto del sistema | `c1-contexto.kdl` | `c1-contexto.puml` | `c1-contexto.png` |
| **C2** — Vista de contenedores | `c2-containers.kdl` | `c2-containers.puml` | `c2-containers.png` |
| **C3** — Modelo de datos (container `db`) | `c3-data-model.kdl` | `c3-data-model.puml` | `c3-data-model.png` |

## Cómo regenerar

Herramientas necesarias: [`k4`](https://github.com/) (compilador KDL → PlantUML
propio del repo) y PlantUML 1.2025+.

```bash
# Validar y emitir PlantUML
k4 c1-contexto.kdl -o c1-contexto.puml --check
k4 c2-containers.kdl -o c2-containers.puml --check
k4 c3-data-model.kdl -o c3-data-model.puml --check

# Renderizar PNG (requiere red para descargar C4-PlantUML library)
plantuml -tpng c1-contexto.puml
plantuml -tpng c2-containers.puml
plantuml -tpng c3-data-model.puml
```

Sin red disponible, `!include https://...` falla. Alternativa offline: clonar
[plantuml-stdlib/C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML)
y reemplazar los `!include` por rutas locales.

## Resumen de la arquitectura

### Actores (C1)

- **Familia** — madre/padre/tutor de egresado. Descubre planes, vota fechas y
  planes 1-3, chatea con empresas. Identificación via `IdentityGate` (escuela →
  grupo → apellido) + `signInAnonymously`.
- **Admin de Empresa** — operador de una empresa de viajes. Carga catálogos,
  propone fechas, registra ventas, responde mensajes. Auth email/password.
- **Super Admin** — dueño del marketplace. Carga catálogos base, crea
  perfiles, audita comisiones y es el único que puede marcar ventas como
  pagada/liquidada.

### Sistema core

El **Marketplace de Egresados** es un sistema multi-tenant que corre:

- 2 SPAs Vite (público en `:5173`, admin en `:5174`).
- 4 servicios Supabase como backend (Auth, PostgreSQL+RLS, Object Storage,
  Edge Functions).

### Containers (C2)

| Container | Stack | Puerto / Función |
|---|---|---|
| `web-public` | React 18 + Vite + Tailwind + shadcn/ui | `:5173` — SPA de familias |
| `web-admin` | Refine + AntD + Vite | `:5174` — SPA de gestión |
| `auth` | GoTrue (Supabase) | Identity: anon + email/password |
| `db` | PostgreSQL 15 + RLS | Datos de esquema, políticas |
| `storage` | S3-compatible (Supabase) | Bucket privado `documentos` |
| `edge-fns` | Deno (Supabase) | Runtime para `procesar-documento` (futuro) |

### Modelo de datos (C3) — descomposición del container `db`

El C3 desglosa el container PostgreSQL en **13 componentes lógicos**
agrupados en 4 boundaries. Refleja la realidad de las 17 migrations
aplicadas al schema.

| Boundary | Componentes | Tablas / artefactos |
|---|---|---|
| *(cross-cutting)* | `rls-helpers` | Funciones SQL `is_super_admin()`, `is_empresa_admin()`, `current_familia_id()`, `current_familia_in_grupo()` |
| **Núcleo** | `identidad`, `clientes`, `oferta`, `geo` | `profiles`, `escuelas`/`grupos`/`familias`/`alumnos`/`familia_miembros`, `empresas`/`destinos`/`planes_viaje`/`documentos`, `ciudades`/`empresas_origenes` |
| **Funnel** | `votacion-fechas`, `votacion-planes`, `mensajeria`, `ventas` | `fechas_reunion`/`votos_fecha`, `votos_plan`, `mensajes`, `ventas` (con generated columns `monto_total`/`comision_monto`) |
| **Crecimiento / soporte** | `crm`, `marketing`, `correcciones`, `legacy` | `leads`/`lead_actividades`, `eventos_anon`, `correcciones`, `planes`/`votos` (espejos deprecados) |

**Por qué este agrupamiento importa**: el diagrama muestra las FK reales
entre componentes y, superpuesto, qué persona puede escribir en cada uno
según RLS. Es la guía de seguridad multi-tenant — quién toca qué tabla,
bajo qué policy. Sin `rls-helpers` ninguna policy funciona, por eso
está fuera de los boundaries pero arriba (cross-cutting).

### Sistemas externos (C1)

- **Supabase Auth** — JWT usado en cada request vía RLS.
- **Supabase Storage** — bucket `documentos` con policies.
- **Pasarela de Pago** *(futuro)* — hoy el cobro lo hace la empresa directo.
- **Pipeline IA de Documentos** *(futuro)* — hoy ocupado por mock client-side.

## Funnel de negocio modelado

Las tres vistas describen el funnel de 4 etapas que atraviesa familia↔empresa.
El C3 mapea cada etapa a componentes específicos del container `db`:

1. **Discovery** — `web-public` lee `planes_viaje` (PostgREST) → componente
   `oferta`. Familias se identifican via `IdentityGate` + anon sign-in →
   componente `identidad` + `clientes`. Eventos anónimos → `marketing`.
2. **Votación de fechas** — `web-admin` propone fechas (`fechas_reunion`) →
   componente `votacion-fechas`. Familias votan sí/no (`votos_fecha`).
   Las fechas propuestas definen hilos iniciales de `mensajeria`.
3. **Votación de planes** — `web-public` rankean 1/2/3 (`votos_plan`) →
   componente `votacion-planes`. Empresa y familias chatean (`mensajes`) →
   componente `mensajeria`. Leads en el camino → componente `crm`.
4. **Cierre** — `web-admin` registra venta (`ventas` con comisión auto) →
   componente `ventas`. Las familias del grupo ven el banner
   `VentaCerrada`. El super-admin audita y es el único que puede mover
   `pagada`/`liquidada` (validado por `is_super_admin()` en `rls-helpers`).

## Convenciones del modelo

- IDs de relaciones siguen orden lógico (1..N) pero la numeración es generada
  por PlantUML en render — no se controla desde KDL.
- Boundaries siguen semántica C4-PlantUML: `(enterprise-boundary)` es la
  organización dueña del sistema; los containers viven dentro. A nivel C3,
  `(container-boundary)` enmarca el container que se descompone y
  `(component-boundary)` agrupa componentes por dominio.
- Los "futuro" (Pasarela de Pago, Pipeline IA) están marcados como
  `(system-ext)` para mostrar el contrato pendiente sin implementarlo.
- Las relaciones con tecnología (HTTPS, JWT, REST/PostgREST) describen el
  canal, no el schema. Los payloads viven en el código fuente de cada SPA.