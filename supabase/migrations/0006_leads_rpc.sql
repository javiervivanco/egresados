-- =============================================================
-- RPC para crear/actualizar leads desde anon
-- =============================================================
-- El cliente JS supabase llama `.insert(...).select('id').single()` para
-- recuperar el id del lead recién creado. La policy INSERT permite la
-- inserción, pero la policy SELECT solo expone leads a super_admin → el
-- return del insert falla con RLS violation.
--
-- Solución estándar: encapsular en una function `security definer` que
-- bypassea RLS internamente y devuelve solo el ID (no datos sensibles).
-- =============================================================

create or replace function lead_upsert(
  p_id            bigint default null,
  p_email         text default null,
  p_apellido      text default null,
  p_telefono      text default null,
  p_escuela_id    bigint default null,
  p_escuela_libre text default null,
  p_grado_buscado text default null,
  p_anio_egreso   smallint default null,
  p_familia_id    bigint default null
) returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_id bigint;
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'email es requerido';
  end if;

  if p_id is not null then
    -- Update parcial: solo seteamos los campos no-null pasados.
    update leads set
      email         = coalesce(p_email,         email),
      apellido      = coalesce(p_apellido,      apellido),
      telefono      = coalesce(p_telefono,      telefono),
      escuela_id    = coalesce(p_escuela_id,    escuela_id),
      escuela_libre = case when p_escuela_id is not null then null else coalesce(p_escuela_libre, escuela_libre) end,
      grado_buscado = coalesce(p_grado_buscado, grado_buscado),
      anio_egreso   = coalesce(p_anio_egreso,   anio_egreso),
      familia_id    = coalesce(p_familia_id,    familia_id)
    where id = p_id
    returning id into v_id;
    return v_id;
  end if;

  insert into leads (email, apellido, telefono, escuela_id, escuela_libre, grado_buscado, anio_egreso, familia_id)
  values (p_email, p_apellido, p_telefono, p_escuela_id, p_escuela_libre, p_grado_buscado, p_anio_egreso, p_familia_id)
  returning id into v_id;
  return v_id;
end $$;

-- Anon y authenticated pueden ejecutarla.
grant execute on function lead_upsert(bigint, text, text, text, bigint, text, text, smallint, bigint) to anon, authenticated;
