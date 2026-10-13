-- =============================================================
-- Seed para dev local. Corre tras supabase db reset / start.
-- =============================================================
-- Cubre los 13 componentes del C3 (docs/c4/c3-data-model.puml):
--
--   Núcleo:
--     • identidad: 3 profiles (1 super + 2 empresa_admin)
--     • clientes: 2 escuelas (1 activa + 1 pendiente), 2 grupos,
--       4 familias, 4 alumnos, 4 familia_miembros
--     • oferta: 2 empresas, 2 destinos, 3 planes_viaje, 1 documento
--     • geo: empresas_origenes (Mendoza + CABA), planes_viaje.origen_ciudad_id
--
--   Funnel:
--     • votacion_fechas: 3 fechas_reunion + 12 votos_fecha
--     • votacion_planes: 12 votos_plan
--     • mensajeria: 3 mensajes en 2 hilos
--     • ventas: 3 ventas (borrador + confirmada + pagada)
--
--   Growth:
--     • crm: 4 leads (1 convertido vía lead_to_familia) + actividades
--     • marketing: 3 eventos_anon
--     • correcciones: 2 reportes
--     • legacy: mirrors de `planes` y `votos`
--
--   rls_helpers: definidos en migrations 0001/0002/0009.
-- =============================================================

-- Usuarios auth (passwords bcrypt de "Admin123!" / "Empresa123!")
-- Nota: GoTrue lee campos string-vacío que no se pueden dejar NULL
-- (confirmation_token, recovery_token, etc) — por eso van con default ''.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@egresados.local',          crypt('Admin123!',   gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flecha-admin@egresados.local',   crypt('Empresa123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'supertour-admin@egresados.local', crypt('Empresa123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '')
on conflict (id) do nothing;

-- GoTrue moderno espera también un registro en auth.identities por cada user.
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@egresados.local","email_verified":true}',          'email', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"flecha-admin@egresados.local","email_verified":true}',   'email', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"supertour-admin@egresados.local","email_verified":true}', 'email', now(), now(), now())
on conflict (provider, provider_id) do nothing;

-- Empresas (comision_pct_default alimenta ventas via trigger — migration 0003)
insert into empresas (id, nombre, slug, contacto_email, comision_pct_default)
values
  (1, 'Flecha',     'flecha',     'contacto@flecha.local',     8.00),
  (2, 'Super Tour', 'super-tour', 'contacto@supertour.local', 10.00)
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('empresas','id'), greatest((select max(id) from empresas), 1));

-- Profiles
insert into profiles (user_id, rol, nombre, empresa_id) values
  ('11111111-1111-1111-1111-111111111111', 'super_admin',  'Super Admin',   null),
  ('22222222-2222-2222-2222-222222222222', 'empresa_admin','Admin Flecha',  1),
  ('33333333-3333-3333-3333-333333333333', 'empresa_admin','Admin SuperT',  2)
on conflict (user_id) do nothing;

-- Escuelas demo: 1 activa (con grupos + funnel completo) + 1 pendiente (auto-creada
-- por onboarding, esperando aprobación del super_admin — ver migration 0008).
insert into escuelas (id, nombre, localidad, provincia, estado)
values
  (1, 'Colegio Demo San Martín', 'Mendoza', 'Mendoza', 'activa'),
  (2, 'Colegio Norte',           'Mendoza', 'Mendoza', 'pendiente')
on conflict (id) do nothing;
-- Backfill ciudad_id desde catálogo de ciudades (migration 0011 también lo hace,
-- pero lo hacemos explícito para que el seed sea self-contained).
update escuelas e
   set ciudad_id = c.id
  from ciudades c
 where lower(c.nombre) = lower(e.localidad)
   and e.ciudad_id is null;
select setval(pg_get_serial_sequence('escuelas','id'), greatest((select max(id) from escuelas), 1));

insert into grupos (id, escuela_id, anio_egreso, grado, estado)
values
  (1, 1, 2026, '6to A', 'activo'),
  (2, 1, 2026, '6to B', 'activo')
on conflict (id) do nothing;
-- Backfill invitacion_token + expira (migration 0013 también lo hace).
update grupos
   set invitacion_token = gen_random_uuid(),
       invitacion_expira_at = now() + interval '90 days'
 where invitacion_token is null;
select setval(pg_get_serial_sequence('grupos','id'), greatest((select max(id) from grupos), 1));

-- 4 familias en el grupo (la 4ta se usa para demostrar el flow de lead convertido)
insert into familias (id, grupo_id, apellido, email) values
  (1, 1, 'García',    'garcia@demo.local'),
  (2, 1, 'Pérez',     'perez@demo.local'),
  (3, 1, 'Rodríguez', 'rodriguez@demo.local'),
  (4, 1, 'López',     'lopez@demo.local')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('familias','id'), greatest((select max(id) from familias), 1));

insert into alumnos (familia_id, nombre) values
  (1, 'Lucía García'),
  (2, 'Tomás Pérez'),
  (3, 'Sofía Rodríguez'),
  (4, 'Mateo López');

-- Destinos + planes demo para que el admin SPA tenga algo que mostrar
insert into destinos (id, empresa_id, nombre, provincia, descripcion) values
  (1, 1, 'Carlos Paz / Córdoba', 'Córdoba', 'Clásico viaje a las sierras cordobesas.'),
  (2, 2, 'Cariló',               'Buenos Aires', 'Bosque y playa.')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('destinos','id'), greatest((select max(id) from destinos), 1));

insert into planes_viaje (destino_id, transporte, dias, noches, plan_pago, cantidad_cuotas, inscripcion, cuota_mensual, total_final) values
  (1, 'Bus',   8, 7, '12 cuotas + inscripción', 12, 150000, 180000, 2310000),
  (1, 'Avión', 8, 7, 'Contado',                  1, 2100000, null, 2100000),
  (2, 'Bus',   6, 5, '10 cuotas',               10, null,   220000, 2200000);
select setval(pg_get_serial_sequence('planes_viaje','id'), greatest((select max(id) from planes_viaje), 1));

-- Plan-by-plan: el plan Avión (id=2) solo sale desde Buenos Aires; los demás
-- heredan los orígenes de la empresa. migration 0015.
update planes_viaje
   set origen_ciudad_id = (select id from ciudades where slug = 'buenos-aires')
 where id = 2;

-- Fechas de reunión demo (etapa 1 de votación): cada empresa propone una al
-- grupo demo. Sirven para validar el componente MeetingDateVoting.
insert into fechas_reunion (empresa_id, grupo_id, fecha, ubicacion, estado) values
  (1, 1, now() + interval '7 days',  'Salón de actos del colegio',          'propuesta'),
  (1, 1, now() + interval '10 days', 'Zoom (link al confirmar)',            'propuesta'),
  (2, 1, now() + interval '14 days', 'Oficina Super Tour · Av. Siempreviva 742', 'propuesta');
select setval(pg_get_serial_sequence('fechas_reunion','id'), greatest((select max(id) from fechas_reunion), 1));

-- =============================================================
-- Núcleo → geo: empresas_origenes (migration 0011)
-- =============================================================
-- Las dos empresas demo operan desde Mendoza + Buenos Aires. El plan
-- Avión Carlos Paz tiene origen_ciudad_id=Buenos Aires (ver update arriba),
-- así que para una familia de Mendoza solo ve 2 planes (Bus CP + Bus Cariló).
-- Esto demuestra el matching geográfico de planes_relevantes().
insert into empresas_origenes (empresa_id, ciudad_id)
select e.id, c.id
  from empresas e
  join ciudades c on c.slug in ('mendoza', 'buenos-aires')
on conflict do nothing;

-- =============================================================
-- Núcleo → oferta: documentos demo
-- =============================================================
-- El bucket `documentos` existe en la migration 0001 (storage.buckets).
-- Acá insertamos las filas de la tabla `documentos` con un storage_path
-- fake (no subimos archivos reales; el admin SPA puede reemplazarlos).
insert into documentos (destino_id, plan_id, nombre, storage_path, mime_type, size_bytes, procesado_estado, datos_extraidos, procesado_at) values
  (1, null, 'planilla-carlos-paz-bus-2026.pdf', 'demo/planilla-cp-bus.pdf', 'application/pdf', 245000,  'procesado',  '{"precio_final":2310000,"cuotas":12,"transporte":"Bus"}', now() - interval '2 days'),
  (1, null, 'fotos-hotel-carlos-paz.zip',        'demo/fotos-cp.zip',        'application/zip', 1820000, 'pendiente', null, null),
  (2, null, 'brochure-carilo-verano-2026.pdf',   'demo/brochure-carilo.pdf', 'application/pdf', 510000,  'procesado',  '{"precio_final":2200000,"cuotas":10,"transporte":"Bus"}', now() - interval '1 day');

-- =============================================================
-- Núcleo → clientes: familia_miembros (migration 0014)
-- =============================================================
-- Cada familia tiene al menos 1 miembro adulto registrado. El backfill de
-- 0014 ya creó los miembros a partir de `familias.email`, pero acá los
-- completamos con nombre + teléfono (que antes quedaban NULL).
insert into familia_miembros (familia_id, email, nombre, telefono, es_principal) values
  (1, 'garcia@demo.local',    'María García',   '+54 261 555 1001', true),
  (2, 'perez@demo.local',     'Carlos Pérez',   '+54 261 555 1002', true),
  (3, 'rodriguez@demo.local', 'Ana Rodríguez',  '+54 261 555 1003', true),
  (4, 'lopez@demo.local',     'Juan López',     '+54 261 555 1004', true)
on conflict do nothing;

-- =============================================================
-- Funnel → votacion-fechas: votos_fecha
-- =============================================================
-- Las 4 familias votan sí/no sobre las 3 fechas propuestas. Sirve para
-- validar el componente MeetingDateVoting y los agregados de la etapa 1.
insert into votos_fecha (familia_id, fecha_id, voto)
select f.id, fr.id,
       case
         when f.id = 1 and fr.id in (1, 3) then true
         when f.id = 2                          then true
         when f.id = 3 and fr.id = 3            then true
         when f.id = 4 and fr.id in (1, 3)      then true
         else false
       end as voto
  from familias f
  cross join fechas_reunion fr;

-- =============================================================
-- Funnel → votacion-planes: votos_plan
-- =============================================================
-- Cada familia rankea 3 planes con prioridad 1/2/3. unique (familia_id, prioridad)
-- impide duplicados. Cobertura: cada plan recibe 4 votos (1 de cada familia).
-- Prioridad final (ponderada): plan con más prioridad-1 gana.
insert into votos_plan (familia_id, plan_id, prioridad) values
  (1, 1, 1), (1, 2, 2), (1, 3, 3),
  (2, 2, 1), (2, 1, 2), (2, 3, 3),
  (3, 3, 1), (3, 1, 2), (3, 2, 3),
  (4, 1, 1), (4, 3, 2), (4, 2, 3);

-- =============================================================
-- Funnel → mensajeria: mensajes
-- =============================================================
-- 2 hilos: uno con Super Tour (más mensajes, ya hubo propuesta de fecha) y
-- uno con Flecha (familia responde a la propuesta). Demuestra la union
-- cliente-side fechas_reunion ∪ mensajes que arman los listados de hilos.
insert into mensajes (grupo_id, empresa_id, autor_user_id, autor_rol, autor_nombre, contenido, leido_empresa, leido_grupo) values
  (1, 1, '22222222-2222-2222-2222-222222222222', 'empresa',  'Admin Flecha',  'Hola familias, ¿qué día les queda mejor para la reunión?', false, true),
  (1, 1, null,                                       'familia',  'García',        'Hola! El sábado a la mañana nos viene mejor.',                true,  false),
  (1, 2, '33333333-3333-3333-3333-333333333333', 'empresa',  'Admin SuperT',  'Confirmamos la reunión del martes 14. ¡Los esperamos!',     true,  false);

-- =============================================================
-- Funnel → ventas: 3 ventas en distintos estados
-- =============================================================
--   • grupo 1 + Flecha: borrador (no bloquea otras propuestas del grupo)
--   • grupo 1 + Super Tour: confirmada (bloquea otras activas del grupo)
--   • grupo 2 + Flecha: pagada (estado final pre-liquidación)
-- El trigger 0003 setea comision_pct desde empresas.comision_pct_default
-- si no se pasa explícito. Las generated columns monto_total/comision_monto
-- se computan automáticamente.
insert into ventas (grupo_id, empresa_id, destino_id, plan_id, cantidad_pasajeros, precio_unitario, comision_pct, estado, created_by, observaciones) values
  (1, 1, 1, 1, 30, 2310000, 8.00,  'borrador',   '22222222-2222-2222-2222-222222222222', 'Pendiente confirmar con grupo 6to A.'),
  (1, 2, 2, 3, 30, 2200000, 10.00, 'confirmada', '33333333-3333-3333-3333-333333333333', 'Cerrado con Super Tour. Pasa a pago.'),
  (2, 1, 1, 1, 25, 2310000, 8.00,  'pagada',     '22222222-2222-2222-2222-222222222222', 'Grupo 6to B. Comisión ya transferida.');

-- =============================================================
-- Growth → crm: leads + lead_actividades (migration 0005-0007)
-- =============================================================
-- 4 leads: 1 frío (sin escuela), 1 tibio (UTM completo pero sin familia),
-- 1 convertido (vía RPC `lead_to_familia` — migration 0018) y 1 descartado.
-- El trigger leads_recalc_score (0009) calcula score automáticamente.
-- El trigger leads_track_conversion (0007) setea estado='convertido' al
-- vincular familia_id; leads_log_estado_change (0007) deja rastro en
-- lead_actividades cuando cambia el estado.
insert into leads (email, apellido, telefono, escuela_id, escuela_libre, grado_buscado, anio_egreso, estado, utm_source, utm_medium, utm_campaign) values
  ('martinez@demo.local',  'Martínez',  '+54 261 555 2001', null, 'Colegio del Sol', '6to A', 2026, 'nuevo',       null,      null,     null),
  ('gonzalez@demo.local',  'González',  '+54 261 555 2002', 1,    null,              '6to A', 2026, 'contactado',  'google',  'cpc',    'primavera-2026'),
  ('sarmiento@demo.local', 'Sarmiento', null,               null, null,              null,    null, 'descartado',  'facebook','social', 'primavera-2026');

-- Convertir lopez@demo.local vía la RPC documentada en el C3
-- (migration 0018: `lead_to_familia`).
select lead_to_familia(
  'lopez@demo.local',  -- p_email
  1,                   -- p_grupo_id
  'López',             -- p_apellido
  '+54 261 555 2003',  -- p_telefono
  'Juan López',        -- p_nombre
  'instagram',         -- p_utm_source
  'social',            -- p_utm_medium
  'verano-2026',       -- p_utm_campaign
  null,                -- p_utm_term
  null                 -- p_utm_content
);

-- Actividades manuales (las transiciones de estado se auto-loguean via trigger).
-- Estas notas las escribió el super_admin en el CRM.
insert into lead_actividades (lead_id, tipo, contenido, autor_user_id, autor_nombre) values
  ((select id from leads where email = 'martinez@demo.local'),  'nota',         'Mandó WhatsApp preguntando por la reunión. Respondimos.', '11111111-1111-1111-1111-111111111111', 'Super Admin'),
  ((select id from leads where email = 'gonzalez@demo.local'),  'email',        'Enviado brochure digital + invitación a la reunión.',      '11111111-1111-1111-1111-111111111111', 'Super Admin'),
  ((select id from leads where email = 'sarmiento@demo.local'), 'llamada',      'Confirmó que no le interesa. Anotado para no re-contactar.', '11111111-1111-1111-1111-111111111111', 'Super Admin'),
  ((select id from leads where email = 'gonzalez@demo.local'),  'whatsapp',     'Pidió info de financiamiento en 12 cuotas.',               '11111111-1111-1111-1111-111111111111', 'Super Admin'),
  -- Conversión de lopez@demo.local: el BEFORE INSERT trigger 0018 setea
  -- estado='convertido' al crear el lead con familia_id, pero el AFTER
  -- trigger `leads_log_estado_change` (0007) solo dispara en UPDATE.
  -- Logueamos manualmente la conversión.
  ((select id from leads where email = 'lopez@demo.local'),     'cambio_estado','Estado inicial: convertido (creado vía lead_to_familia)', '11111111-1111-1111-1111-111111111111', 'Sistema');

-- =============================================================
-- Growth → marketing: eventos_anon (migration 0009)
-- =============================================================
-- Buffer de tracking para visitantes que todavía no dejaron email.
-- Sirve para atribuir conversiones en el dashboard del super_admin.
insert into eventos_anon (evento, ctx, session_id) values
  ('landing_view',     '{"path":"/","ref":"google"}',                'sess-aaa'),
  ('wizard_started',   '{"step":"duracion"}',                        'sess-aaa'),
  ('card_expand',      '{"empresa":"Flecha","destino":"Carlos Paz"}','sess-aaa'),
  ('plan_comparado',   '{"planes":[1,3]}',                           'sess-aaa'),
  ('identity_started', '{"step":"escuela"}',                         'sess-bbb');

-- =============================================================
-- Growth → correcciones
-- =============================================================
-- Reportes de usuarios sobre errores en los datos cargados.
insert into correcciones (plan_id, destino_id, campo, valor_actual, valor_correcto, comentario, reportado_by, estado) values
  (1,    null, 'cuota_mensual',   '180000', '175000',           'El precio cambió en la última planilla enviada por mail.', null, 'pendiente'),
  (null, 1,    'descripcion',     'Clásico viaje a las sierras cordobesas.', 'Incluye excursion al cerro y city tour por Carlos Paz.', 'Faltan detalles de las actividades.', null, 'pendiente'),
  (2,    null, 'transporte',      'Avión',  'Micro premium',     'Tiene micros pero no avión para esta fecha.', null, 'resuelto');

-- =============================================================
-- Growth → legacy: mirrors de `planes` y `votos`
-- =============================================================
-- El frontend público todavía lee `votos` (VotingResults legacy) y los
-- JSON de fallback mirrorean `planes`. Insertamos las filas equivalentes
-- para que el modo legacy siga funcionando en dev.
insert into planes (empresa, destino, transporte, dias, noches, plan_pago, cantidad_cuotas, inscripcion, cuota_mensual, total_final) values
  ('Flecha',     'Carlos Paz / Córdoba', 'Bus',   8, 7, '12 cuotas + inscripción', 12, 150000,  180000, 2310000),
  ('Flecha',     'Carlos Paz / Córdoba', 'Avión', 8, 7, 'Contado',                  1, 2100000, null,   2100000),
  ('Super Tour', 'Cariló',               'Bus',   6, 5, '10 cuotas',               10, null,    220000, 2200000);

insert into votos (nombre, destino, empresa, duracion, prioridad, plan_pago, total_final, cuota_mensual, comentario) values
  ('García',    'Carlos Paz / Córdoba', 'Flecha',     '8 días / 7 noches', 1, '12 cuotas + inscripción', 2310000, 180000, 'Primera opción'),
  ('García',    'Cariló',               'Super Tour', '6 días / 5 noches', 2, '10 cuotas',                2200000, 220000, null),
  ('García',    'Carlos Paz / Córdoba', 'Flecha',     '8 días / 7 noches', 3, 'Contado',                  2100000, null,   'Si bajan las cuotas'),
  ('Pérez',     'Carlos Paz / Córdoba', 'Flecha',     '8 días / 7 noches', 2, '12 cuotas + inscripción', 2310000, 180000, null),
  ('Pérez',     'Cariló',               'Super Tour', '6 días / 5 noches', 1, '10 cuotas',                2200000, 220000, 'Más barato'),
  ('Rodríguez', 'Cariló',               'Super Tour', '6 días / 5 noches', 1, '10 cuotas',                2200000, 220000, 'Mejor precio'),
  ('López',     'Carlos Paz / Córdoba', 'Flecha',     '8 días / 7 noches', 1, '12 cuotas + inscripción', 2310000, 180000, null);
