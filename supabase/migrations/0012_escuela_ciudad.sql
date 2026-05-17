-- =============================================================
-- Extiende escuela_lead_create para aceptar ciudad_id
-- =============================================================
-- El onboarding ya pregunta la ciudad antes de tipear la escuela cold;
-- queremos persistirla en el mismo round-trip (RLS de escuelas no deja
-- a anon hacer UPDATE separado).

create or replace function escuela_lead_create(
  p_nombre     text,
  p_localidad  text default null,
  p_provincia  text default null,
  p_ciudad_id  bigint default null
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

  select id into v_id from escuelas where lower(nombre) = lower(v_nombre) limit 1;
  if v_id is not null then
    if p_ciudad_id is not null then
      update escuelas set ciudad_id = coalesce(ciudad_id, p_ciudad_id) where id = v_id;
    end if;
    return v_id;
  end if;

  insert into escuelas (nombre, localidad, provincia, ciudad_id, estado)
  values (v_nombre, nullif(btrim(p_localidad), ''), nullif(btrim(p_provincia), ''),
          p_ciudad_id, 'pendiente')
  returning id into v_id;
  return v_id;
end $$;

grant execute on function escuela_lead_create(text, text, text, bigint) to anon, authenticated;
