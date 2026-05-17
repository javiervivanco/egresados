# Supabase local

Stack local levantado via la CLI oficial (`npx supabase`), que orquesta una
red docker con Postgres + GoTrue + Storage + Studio + Kong + Realtime +
Inbucket (mail catcher para confirmar signups).

## Levantar

```bash
make up        # primera vez baja imágenes (~5 min)
make studio    # abre http://127.0.0.1:54323
make status    # imprime URLs y keys
```

Endpoints por defecto:

| Servicio  | URL                       |
| --------- | ------------------------- |
| API REST  | http://127.0.0.1:54321    |
| DB        | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio    | http://127.0.0.1:54323    |
| Inbucket  | http://127.0.0.1:54324    |

Las **anon** y **service_role** keys son fijas en dev (no rotan) — están en
`.env.example` listas para copiarse a `.env.local`.

## Esquema y seed

Al ejecutar `make up`, la CLI corre todas las migrations en
`supabase/migrations/` y luego `supabase/seed.sql`. Para reaplicar desde cero
(borra todos los datos locales):

```bash
make db-reset
```

## Cuentas demo (post-seed)

| Email                              | Password      | Rol            |
| ---------------------------------- | ------------- | -------------- |
| admin@egresados.local              | Admin123!     | super_admin    |
| flecha-admin@egresados.local       | Empresa123!   | empresa_admin  |
| supertour-admin@egresados.local    | Empresa123!   | empresa_admin  |

## Pipeline de procesamiento IA (mock)

Hoy, cuando un admin sube un documento desde la UI, el cliente:
1. Sube el archivo al bucket `documentos`.
2. Inserta una fila en `documentos` con `procesado_estado = 'pendiente'`.
3. Lanza un mock JS que tras 2s pone `procesado` con datos fake en `datos_extraidos`.

Cuando el pipeline real se implemente, va a vivir en
`supabase/functions/procesar-documento/` (edge function) y va a:
- Disparar por webhook al insert en `documentos`.
- Leer el archivo del Storage, pasarlo por LLM/OCR.
- Persistir el JSON resultante en `datos_extraidos` y transicionar el estado.
