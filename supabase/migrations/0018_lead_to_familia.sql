-- =============================================================
-- RPC: lead_to_familia — convierte un lead en familia
-- =============================================================
-- El C3 (docs/c4/c3-data-model.puml) documenta la conversión
-- lead→familia como una sola RPC `lead_to_familia`. Hasta acá la
-- conversión se hacía con dos llamadas separadas:
--   1) `familia_unirse` (0014) — crea o agrega miembro a la familia
--   2) `lead_upsert` (0006/0010) — setea familia_id en el lead
--
-- Esta migration agrega el wrapper que hace ambas cosas en una sola
-- round-trip desde el frontend anon. El trigger `leads_track_conversion`
-- (0007) sigue siendo el que transiciona estado a 'convertido' cuando
-- se setea familia_id en un UPDATE.
--
-- Firma: email + grupo + apellido + (telefono, nombre) + UTM opcional.
-- Retorna jsonb con { lead_id, familia_id, miembro_id, es_nueva_familia,
-- es_nuevo_lead, es_nuevo_miembro }.
-- =============================================================

-- Trigger BEFORE INSERT para cubrir el caso donde el lead se crea con
-- familia_id ya seteado (camino de `lead_upsert` con p_id=null y
-- p_familia_id!=null). El trigger UPDATE de 0007 no lo cubre.
create or replace function leads_track_conversion_insert() returns trigger
  language plpgsql as $$
begin
  if new.familia_id is not null and new.estado in ('nuevo', 'contactado', 'calificado') then
    new.estado := 'convertido';
  end if;
  return new;
end $$;

drop trigger if exists trg_leads_conversion_insert on leads;
create trigger trg_leads_conversion_insert
  before insert on leads
  for each row execute function leads_track_conversion_insert();

create or replace function lead_to_familia(
  p_email         text,
  p_grupo_id      bigint,
  p_apellido      text,
  p_telefono      text default null,
  p_nombre        text default null,
  p_utm_source    text default null,
  p_utm_medium    text default null,
  p_utm_campaign  text default null,
  p_utm_term      text default null,
  p_utm_content   text default null
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_familia_id   bigint;
  v_miembro_id   bigint;
  v_lead_id      bigint;
  v_es_nueva_fam boolean;
  v_es_nuevo_mb  boolean;
  v_payload      jsonb;
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'email es requerido';
  end if;
  if p_grupo_id is null then
    raise exception 'grupo_id es requerido';
  end if;
  if p_apellido is null or btrim(p_apellido) = '' then
    raise exception 'apellido es requerido';
  end if;

  -- 1) Crear o unirse a la familia. `familia_unirse` ya devuelve
  --    {familia_id, miembro_id, es_principal, es_nueva_familia} —
  --    normalizamos a camelCase para el cliente.
  v_payload := familia_unirse(
    p_grupo_id,
    p_apellido,
    p_email,
    p_telefono,
    p_nombre
  );
  v_familia_id     := (v_payload->>'familia_id')::bigint;
  v_miembro_id     := (v_payload->>'miembro_id')::bigint;
  v_es_nueva_fam   := coalesce((v_payload->>'es_nueva_familia')::boolean, false);
  v_es_nuevo_mb    := v_es_nueva_fam; -- si la familia es nueva, el miembro también

  -- 2) Buscar el lead existente por email. Si existe, linkear familia_id
  --    (el trigger 0007 lo marca como 'convertido'). Si no existe, crear
  --    uno nuevo con todos los datos + UTM via `lead_upsert` con p_id=null.
  select id into v_lead_id from leads where lower(email) = lower(btrim(p_email)) limit 1;

  if v_lead_id is not null then
    v_lead_id := lead_upsert(
      p_id          := v_lead_id,
      p_email       := p_email,
      p_familia_id  := v_familia_id,
      p_apellido    := p_apellido,
      p_telefono    := p_telefono,
      p_utm_source  := p_utm_source,
      p_utm_medium  := p_utm_medium,
      p_utm_campaign := p_utm_campaign,
      p_utm_term    := p_utm_term,
      p_utm_content := p_utm_content
    );
  else
    v_lead_id := lead_upsert(
      p_email       := p_email,
      p_familia_id  := v_familia_id,
      p_apellido    := p_apellido,
      p_telefono    := p_telefono,
      p_utm_source  := p_utm_source,
      p_utm_medium  := p_utm_medium,
      p_utm_campaign := p_utm_campaign,
      p_utm_term    := p_utm_term,
      p_utm_content := p_utm_content
    );
  end if;

  return jsonb_build_object(
    'lead_id',           v_lead_id,
    'familia_id',        v_familia_id,
    'miembro_id',        v_miembro_id,
    'es_nueva_familia',  v_es_nueva_fam,
    'es_nuevo_miembro',  v_es_nuevo_mb
  );
end $$;

grant execute on function lead_to_familia(
  text, bigint, text, text, text,
  text, text, text, text, text
) to anon, authenticated;
