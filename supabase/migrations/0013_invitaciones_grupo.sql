-- =============================================================
-- Invitación viral del grupo
-- =============================================================
-- Una vez que la primera familia se registra, queremos que invite al
-- resto de las familias de su grado. Cada grupo tiene un token único
-- compartible (link "?inv=<token>") con validez de 90 días.
--
-- El token persiste como columna en `grupos` (single token por grupo, no
-- por invitación individual — decisión del producto).

-- =============================================================
-- 1. Token en grupos + helpers
-- =============================================================
alter table grupos
  add column if not exists invitacion_token uuid default gen_random_uuid() not null,
  add column if not exists invitacion_expira_at timestamptz
    default (now() + interval '90 days') not null;

-- Para grupos viejos que ya existían antes de la migración (default solo
-- aplica a nuevos), backfilleamos.
update grupos
   set invitacion_token = gen_random_uuid()
 where invitacion_token is null;

update grupos
   set invitacion_expira_at = now() + interval '90 days'
 where invitacion_expira_at is null;

create unique index if not exists grupos_invitacion_token_uidx on grupos(invitacion_token);

-- =============================================================
-- 2. RPC para resolver un token de invitación
-- =============================================================
-- El frontend anon llama esta RPC con el token de la URL. Devuelve el
-- grupo + escuela si el token es válido (existe y no expiró). Nunca
-- expone otros datos sensibles.

create or replace function grupo_resolver_invitacion(p_token uuid)
returns table (
  grupo_id      bigint,
  grupo_grado   text,
  anio_egreso   smallint,
  escuela_id    bigint,
  escuela_nombre text,
  ciudad_id     bigint,
  expirado      boolean
)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select
    g.id,
    g.grado,
    g.anio_egreso,
    e.id,
    e.nombre,
    e.ciudad_id,
    (g.invitacion_expira_at <= now()) as expirado
  from grupos g
  join escuelas e on e.id = g.escuela_id
  where g.invitacion_token = p_token
  limit 1;
$$;

grant execute on function grupo_resolver_invitacion(uuid) to anon, authenticated;

-- =============================================================
-- 3. RPC para que la familia regenere el token (admin de su propio grupo)
-- =============================================================
-- Si la familia siente que el link "se filtró" puede pedir uno nuevo.
-- Mantiene la simpleza del modelo (un token por grupo) y le da poder al
-- usuario sin necesidad de exponer un UPDATE directo.

create or replace function grupo_regenerar_invitacion(p_grupo_id bigint)
returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_token uuid;
begin
  -- Solo familias del grupo (o super_admin) pueden regenerar.
  if not (is_super_admin() or current_familia_in_grupo(p_grupo_id)) then
    raise exception 'no autorizado';
  end if;

  v_token := gen_random_uuid();
  update grupos
     set invitacion_token = v_token,
         invitacion_expira_at = now() + interval '90 days'
   where id = p_grupo_id;
  return v_token;
end $$;

grant execute on function grupo_regenerar_invitacion(bigint) to anon, authenticated;
