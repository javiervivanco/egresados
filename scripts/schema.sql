-- ==========================================
-- 1. PLANES — los datos de viaje
-- ==========================================
create table if not exists planes (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  empresa text not null,
  destino text not null,
  transporte text,
  dias smallint,
  noches smallint,
  plan_pago text,
  cantidad_cuotas smallint,
  inscripcion integer,
  reserva integer,
  primera_cuota integer,
  cuota_mensual integer,
  anticipo_saldo integer,
  total_final integer,
  liberados text,
  seguro text,
  descuentos text,
  actividades text,
  vigencia text
);

alter table planes enable row level security;

create policy "Lectura pública de planes"
  on planes for select
  to anon
  using (true);

-- ==========================================
-- 2. VOTOS
-- ==========================================
create table if not exists votos (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  nombre text not null,
  destino text not null,
  empresa text,
  duracion text,
  prioridad smallint,          -- 1=1ra opción, 2=2da, 3=3ra
  plan_pago text,
  total_final integer,
  cuota_mensual integer,
  comentario text
);

alter table votos enable row level security;

create policy "Cualquiera puede votar"
  on votos for insert to anon with check (true);

create policy "Cualquiera puede ver votos"
  on votos for select to anon using (true);

-- ==========================================
-- 3. CORRECCIONES
-- ==========================================
create table if not exists correcciones (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  empresa text not null,
  destino text not null,
  plan_pago text,
  campo text not null,
  valor_actual text,
  valor_correcto text,
  comentario text
);

alter table correcciones enable row level security;

create policy "Cualquiera puede reportar"
  on correcciones for insert to anon with check (true);
