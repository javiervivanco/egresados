-- =============================================================
-- Escuelas pendientes (auto-creación desde el onboarding)
-- =============================================================
-- Hasta ahora cuando una familia entraba al onboarding y su colegio no
-- estaba cargado, el flujo terminaba en un dead-end ("te avisamos"). Eso
-- bloquea el alta. Ahora se crea la escuela con estado='pendiente' y se
-- continúa el flujo. Los super_admins revisan/aprueban después.
--
-- Mismo patrón para grupos: si el alumno no encuentra su grado, lo crea
-- pendiente al vuelo.
-- =============================================================

alter table escuelas
  add column if not exists estado text not null default 'activa';

alter table escuelas
  drop constraint if exists escuelas_estado_check;
alter table escuelas
  add constraint escuelas_estado_check
  check (estado in ('activa', 'pendiente', 'archivada'));

-- Index para que el picker filtre rápido por estado activo.
create index if not exists escuelas_estado_idx on escuelas(estado);

-- =============================================================
-- RPCs security definer para que el anon pueda crear filas
-- pendientes sin abrir un INSERT directo sobre las tablas.
-- =============================================================

create or replace function escuela_lead_create(
  p_nombre    text,
  p_localidad text default null,
  p_provincia text default null
) returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_nombre text := btrim(p_nombre);
  v_id bigint;
begin
  if v_nombre is null or v_nombre = '' then
    raise exception 'nombre de escuela requerido';
  end if;

  -- Reutilizar si ya existe una con el mismo nombre (case-insensitive).
  select id into v_id from escuelas where lower(nombre) = lower(v_nombre) limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into escuelas (nombre, localidad, provincia, estado)
  values (v_nombre, nullif(btrim(p_localidad), ''), nullif(btrim(p_provincia), ''), 'pendiente')
  returning id into v_id;
  return v_id;
end $$;

grant execute on function escuela_lead_create(text, text, text) to anon, authenticated;

create or replace function grupo_lead_create(
  p_escuela_id  bigint,
  p_grado       text,
  p_anio_egreso smallint
) returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_grado text := btrim(p_grado);
  v_id bigint;
begin
  if p_escuela_id is null then
    raise exception 'escuela_id requerido';
  end if;
  if p_anio_egreso is null then
    raise exception 'anio_egreso requerido';
  end if;

  -- Reutilizar si ya existe un grupo (escuela, grado, año).
  select id into v_id from grupos
   where escuela_id = p_escuela_id
     and coalesce(lower(grado), '') = coalesce(lower(v_grado), '')
     and anio_egreso = p_anio_egreso
   limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into grupos (escuela_id, grado, anio_egreso, estado)
  values (p_escuela_id, nullif(v_grado, ''), p_anio_egreso, 'pendiente')
  returning id into v_id;
  return v_id;
end $$;

grant execute on function grupo_lead_create(bigint, text, smallint) to anon, authenticated;
