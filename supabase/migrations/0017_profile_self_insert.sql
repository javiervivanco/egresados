-- =============================================================
-- Fix: anon que firma anónimamente debe poder crear su profile
-- =============================================================
-- 0001_init creó policies select/update/super_admin pero faltó la INSERT
-- para el caso self-service: la familia firma anon, queda con auth.uid()
-- propio, y el onboarding intenta upsert profiles { user_id, rol='familia',
-- familia_id }. Sin INSERT policy, RLS lo rechaza.
--
-- Constraint del check: rol obligatoriamente 'familia' (no permitimos
-- self-elevation a super_admin / empresa_admin).

drop policy if exists "profile self insert" on profiles;
create policy "profile self insert" on profiles for insert
  to anon, authenticated
  with check (user_id = auth.uid() and rol = 'familia');
