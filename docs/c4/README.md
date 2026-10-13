# Arquitectura C4 — Egresados

Diagramas C4 del sistema Egresados (marketplace de viajes de egresados),
mantenidos como fuente de verdad arquitectónica.

## Capas modeladas

| Capa | Archivo KDL | Archivo PUML | Render |
|---|---|---|---|
| **C1** — Contexto del sistema | `c1-contexto.kdl` | `c1-contexto.puml` | `c1-contexto.png` |
| **C2** — Vista de contenedores | `c2-containers.kdl` | `c2-containers.puml` | `c2-containers.png` |

## Cómo regenerar

Herramientas necesarias: [`k4`](https://github.com/) (compilador KDL → PlantUML
propio del repo) y PlantUML 1.2025+.

```bash
# Validar y emitir PlantUML
k4 c1-contexto.kdl -o c1-contexto.puml --check
k4 c2-containers.kdl -o c2-containers.puml --check

# Renderizar PNG (requiere red para descargar C4-PlantUML library)
plantuml -tpng c1-contexto.puml
plantuml -tpng c2-containers.puml
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

### Sistemas externos (C1)

- **Supabase Auth** — JWT usado en cada request vía RLS.
- **Supabase Storage** — bucket `documentos` con policies.
- **Pasarela de Pago** *(futuro)* — hoy el cobro lo hace la empresa directo.
- **Pipeline IA de Documentos** *(futuro)* — hoy ocupado por mock client-side.

## Funnel de negocio modelado

Las dos vistas describen el funnel de 4 etapas que atraviesa familia↔empresa:

1. **Discovery** — `web-public` lee `planes_viaje` (PostgREST). Familias se
   identifican via `IdentityGate` + anon sign-in.
2. **Votación de fechas** — `web-admin` propone fechas (`fechas_reunion`),
   `web-public` vota sí/no (`votos_fecha`).
3. **Votación de planes** — `web-public` rankea 1/2/3 (`votos_plan` +
   `votos`). Empresa y familias chatean (`mensajes`).
4. **Cierre** — `web-admin` registra venta (`ventas` con comisión auto). Las
   familias del grupo ven el banner `VentaCerrada`. El super-admin audita y
   es el único que puede mover `pagada`/`liquidada`.

## Convenciones del modelo

- IDs de relaciones siguen orden lógico (1..N) pero la numeración es generada
  por PlantUML en render — no se controla desde KDL.
- Boundaries siguen semántica C4-PlantUML: `(enterprise-boundary)` es la
  organización dueña del sistema; los containers viven dentro.
- Los "futuro" (Pasarela de Pago, Pipeline IA) están marcados como
  `(system-ext)` para mostrar el contrato pendiente sin implementarlo.
- Las relaciones con tecnología (HTTPS, JWT, REST/PostgREST) describen el
  canal, no el schema. Los payloads viven en el código fuente de cada SPA.