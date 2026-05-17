-- =============================================================
-- Policies CRUD que faltaban
-- =============================================================
-- 0001 dejó algunas tablas sin policy DELETE explícita. Sin la policy, RLS
-- bloquea el delete incluso para super_admin. Las agregamos acá.
-- =============================================================

create policy "familias delete super" on familias for delete
  using (is_super_admin());

create policy "alumnos delete super" on alumnos for delete
  using (is_super_admin() or familia_id = current_familia_id());

create policy "correcciones delete super" on correcciones for delete
  using (is_super_admin());

-- Empresa puede eliminar (hard delete) destinos/planes/documentos propios.
-- Para soft delete usamos activo=false; el hard delete solo lo hacen super
-- y eventualmente la empresa cuando recién acaba de cargar algo por error.
create policy "destinos delete owner" on destinos for delete
  using (is_super_admin() or is_empresa_admin(empresa_id));

create policy "planes_viaje delete owner" on planes_viaje for delete
  using (is_super_admin() or is_empresa_admin((select empresa_id from destinos where id = destino_id)));

create policy "documentos delete owner" on documentos for delete
  using (
    is_super_admin() or
    (destino_id is not null and is_empresa_admin((select empresa_id from destinos where id = destino_id))) or
    (plan_id    is not null and is_empresa_admin((select empresa_id from destinos d join planes_viaje p on p.destino_id = d.id where p.id = plan_id)))
  );

create policy "fechas_reunion delete owner" on fechas_reunion for delete
  using (is_super_admin() or is_empresa_admin(empresa_id));

-- Frontend público (anon) puede leer empresas/escuelas/grupos activos para el
-- IdentityGate. Ya están abiertos a anon en 0001. Para destinos también
-- agregamos políticas explícitas — ya estaban en 0001 con `read` to anon.
