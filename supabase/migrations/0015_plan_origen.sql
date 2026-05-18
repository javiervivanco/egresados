-- =============================================================
-- Origen por plan (matching plan-by-plan)
-- =============================================================
-- Una empresa puede operar desde varias ciudades pero no cada plan está
-- disponible desde todas. Ejemplo: Flecha sale desde Mendoza y Córdoba,
-- pero su plan a Bariloche solo sale desde Mendoza. El plan a Carlos Paz
-- solo desde Córdoba.
--
-- Modelo:
--   planes_viaje.origen_ciudad_id (nullable FK):
--     - NOT NULL → solo disponible desde esa ciudad específica.
--     - NULL     → hereda los orígenes de la empresa (empresas_origenes).
--
-- Compatibilidad: planes existentes quedan con NULL → siguen funcionando
-- con el filtro empresa-level que ya existe. El super_admin va asignando
-- ciudad por plan cuando sea necesario.

alter table planes_viaje
  add column if not exists origen_ciudad_id bigint
    references ciudades(id) on delete set null;

create index if not exists planes_viaje_origen_idx
  on planes_viaje(origen_ciudad_id) where origen_ciudad_id is not null;

-- =============================================================
-- Helper: filtro definitivo para el frontend público.
-- =============================================================
-- Reemplaza planes_relevantes(ciudad_id) con lógica plan-by-plan.
-- Un plan es relevante para una ciudad si:
--   a) el plan tiene origen específico = ciudad pasada, O
--   b) el plan no tiene origen específico Y la empresa opera desde ciudad.

create or replace function planes_relevantes(p_ciudad_id bigint default null)
returns setof planes_viaje
  language sql stable
as $$
  select p.* from planes_viaje p
  where p_ciudad_id is null
     or (
       -- Caso (a): origen específico del plan matchea.
       p.origen_ciudad_id = p_ciudad_id
       or (
         -- Caso (b): plan sin origen propio → herencia empresa-level.
         p.origen_ciudad_id is null
         and exists (
           select 1 from empresas_origenes co
           join destinos d on d.empresa_id = co.empresa_id
           where co.ciudad_id = p_ciudad_id
             and p.destino_id = d.id
         )
       )
     );
$$;
