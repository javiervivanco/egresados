-- =============================================================
-- Views agregadas para el dashboard del super_admin
-- =============================================================
-- Tres lentes:
--   1) dashboard_funnel    — counts globales por etapa del funnel
--   2) dashboard_utm       — leads por campaña + tasa de conversión
--   3) dashboard_ciudades  — escuelas/familias/ventas por ciudad
--
-- Las views se ejecutan con security_invoker → respetan RLS del usuario
-- que invoca. Como solo el super_admin puede SELECT leads/ventas/etc.,
-- los conteos quedan correctos al ser invocados por él. Las RLS internas
-- protegen contra acceso indebido si alguna view se expusiera por error.

-- =============================================================
-- 1. Funnel global
-- =============================================================
create or replace view dashboard_funnel
with (security_invoker = on)
as
  select
    (select count(*)::int from leads)                                              as leads_total,
    (select count(*)::int from leads where familia_id is not null)                 as leads_a_familia,
    (select count(*)::int from familias)                                           as familias_total,
    (select count(distinct familia_id)::int from votos_fecha)                      as familias_voto_fecha,
    (select count(distinct grupo_id)::int from fechas_reunion
      where estado in ('confirmada', 'realizada'))                                 as grupos_con_reunion,
    (select count(*)::int from familias f
      where (select count(*) from votos_plan vp where vp.familia_id = f.id) >= 3)  as familias_voto_plan_completo,
    (select count(distinct grupo_id)::int from ventas
      where estado in ('confirmada', 'pagada', 'liquidada'))                       as grupos_con_venta;

grant select on dashboard_funnel to authenticated;

-- =============================================================
-- 2. UTM aggregator (cohort por campaña)
-- =============================================================
create or replace view dashboard_utm
with (security_invoker = on)
as
  select
    coalesce(utm_campaign, '(sin campaña)') as campaign,
    coalesce(utm_source,   '(sin source)')  as source,
    coalesce(utm_medium,   '(sin medium)')  as medium,
    count(*)::int                                                 as leads,
    count(*) filter (where familia_id is not null)::int            as familias,
    coalesce(round(avg(score))::int, 0)                            as score_promedio,
    min(created_at)                                                as primer_lead,
    max(created_at)                                                as ultimo_lead
  from leads
  group by 1, 2, 3
  order by leads desc;

grant select on dashboard_utm to authenticated;

-- =============================================================
-- 3. Por ciudad
-- =============================================================
create or replace view dashboard_ciudades
with (security_invoker = on)
as
  select
    c.id          as ciudad_id,
    c.nombre      as ciudad,
    c.provincia,
    coalesce(count(distinct e.id), 0)::int                       as escuelas,
    coalesce(count(distinct g.id), 0)::int                       as grupos,
    coalesce(count(distinct f.id), 0)::int                       as familias,
    coalesce(count(distinct v.id) filter (
      where v.estado in ('confirmada', 'pagada', 'liquidada')
    ), 0)::int                                                    as ventas_cerradas,
    coalesce(count(distinct co.empresa_id), 0)::int               as empresas_operan
  from ciudades c
  left join escuelas e             on e.ciudad_id   = c.id
  left join grupos   g             on g.escuela_id  = e.id
  left join familias f             on f.grupo_id    = g.id
  left join ventas   v             on v.grupo_id    = g.id
  left join empresas_origenes co   on co.ciudad_id  = c.id
  group by c.id, c.nombre, c.provincia
  order by familias desc, escuelas desc;

grant select on dashboard_ciudades to authenticated;

-- =============================================================
-- 4. Distribución de score (cohortes)
-- =============================================================
-- Bucketea leads por score para ver cuántos están en cada "temperatura".
create or replace view dashboard_score_buckets
with (security_invoker = on)
as
  select
    case
      when score >= 50 then 'caliente (50+)'
      when score >= 25 then 'tibio (25-49)'
      when score >= 10 then 'frío (10-24)'
      else 'no calificado (<10)'
    end as bucket,
    count(*)::int as leads
  from leads
  group by 1
  order by min(score) desc;

grant select on dashboard_score_buckets to authenticated;
