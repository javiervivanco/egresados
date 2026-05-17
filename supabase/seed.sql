-- =============================================================
-- Seed para dev local. Corre tras supabase db reset / start.
-- =============================================================
-- Crea:
--   * 1 super-admin (admin@egresados.local / Admin123!)
--   * 2 empresas con su admin (flecha-admin@..., supertour-admin@...)
--   * 1 escuela con un grupo (6to A 2026)
--   * 3 familias en ese grupo
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

-- Empresas
insert into empresas (id, nombre, slug, contacto_email)
values
  (1, 'Flecha',     'flecha',     'contacto@flecha.local'),
  (2, 'Super Tour', 'super-tour', 'contacto@supertour.local')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('empresas','id'), greatest((select max(id) from empresas), 1));

-- Profiles
insert into profiles (user_id, rol, nombre, empresa_id) values
  ('11111111-1111-1111-1111-111111111111', 'super_admin',  'Super Admin',   null),
  ('22222222-2222-2222-2222-222222222222', 'empresa_admin','Admin Flecha',  1),
  ('33333333-3333-3333-3333-333333333333', 'empresa_admin','Admin SuperT',  2)
on conflict (user_id) do nothing;

-- Escuela demo
insert into escuelas (id, nombre, localidad, provincia)
values (1, 'Colegio Demo San Martín', 'Mendoza', 'Mendoza')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('escuelas','id'), greatest((select max(id) from escuelas), 1));

insert into grupos (id, escuela_id, anio_egreso, grado)
values (1, 1, 2026, '6to A')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('grupos','id'), greatest((select max(id) from grupos), 1));

-- 3 familias en el grupo
insert into familias (id, grupo_id, apellido, email) values
  (1, 1, 'García',    'garcia@demo.local'),
  (2, 1, 'Pérez',     'perez@demo.local'),
  (3, 1, 'Rodríguez', 'rodriguez@demo.local')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('familias','id'), greatest((select max(id) from familias), 1));

insert into alumnos (familia_id, nombre) values
  (1, 'Lucía García'),
  (2, 'Tomás Pérez'),
  (3, 'Sofía Rodríguez');

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

-- Fechas de reunión demo (etapa 1 de votación): cada empresa propone una al
-- grupo demo. Sirven para validar el componente MeetingDateVoting.
insert into fechas_reunion (empresa_id, grupo_id, fecha, ubicacion, estado) values
  (1, 1, now() + interval '7 days',  'Salón de actos del colegio',          'propuesta'),
  (1, 1, now() + interval '10 days', 'Zoom (link al confirmar)',            'propuesta'),
  (2, 1, now() + interval '14 days', 'Oficina Super Tour · Av. Siempreviva 742', 'propuesta');
