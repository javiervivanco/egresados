-- =============================================================
-- Extiende lead_upsert con UTM (additive, backwards-compat)
-- =============================================================
-- Necesitamos que el frontend mande UTM en el mismo round-trip que el
-- email, sin hacer UPDATE separado (anon no puede UPDATE leads por RLS).

create or replace function lead_upsert(
  p_id            bigint default null,
  p_email         text default null,
  p_apellido      text default null,
  p_telefono      text default null,
  p_escuela_id    bigint default null,
  p_escuela_libre text default null,
  p_grado_buscado text default null,
  p_anio_egreso   smallint default null,
  p_familia_id    bigint default null,
  p_utm_source    text default null,
  p_utm_medium    text default null,
  p_utm_campaign  text default null,
  p_utm_term      text default null,
  p_utm_content   text default null
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
    update leads set
      email         = coalesce(p_email,         email),
      apellido      = coalesce(p_apellido,      apellido),
      telefono      = coalesce(p_telefono,      telefono),
      escuela_id    = coalesce(p_escuela_id,    escuela_id),
      escuela_libre = case when p_escuela_id is not null then null else coalesce(p_escuela_libre, escuela_libre) end,
      grado_buscado = coalesce(p_grado_buscado, grado_buscado),
      anio_egreso   = coalesce(p_anio_egreso,   anio_egreso),
      familia_id    = coalesce(p_familia_id,    familia_id),
      utm_source    = coalesce(p_utm_source,    utm_source),
      utm_medium    = coalesce(p_utm_medium,    utm_medium),
      utm_campaign  = coalesce(p_utm_campaign,  utm_campaign),
      utm_term      = coalesce(p_utm_term,      utm_term),
      utm_content   = coalesce(p_utm_content,   utm_content),
      last_seen_at  = now()
    where id = p_id
    returning id into v_id;
    return v_id;
  end if;

  insert into leads (email, apellido, telefono, escuela_id, escuela_libre,
                     grado_buscado, anio_egreso, familia_id,
                     utm_source, utm_medium, utm_campaign, utm_term, utm_content)
  values (p_email, p_apellido, p_telefono, p_escuela_id, p_escuela_libre,
          p_grado_buscado, p_anio_egreso, p_familia_id,
          p_utm_source, p_utm_medium, p_utm_campaign, p_utm_term, p_utm_content)
  returning id into v_id;
  return v_id;
end $$;

-- La firma cambió → re-grant.
grant execute on function lead_upsert(
  bigint, text, text, text, bigint, text, text, smallint, bigint,
  text, text, text, text, text
) to anon, authenticated;
