import { supabaseClient } from "../lib/supabaseClient";

// Matriz de permisos por rol × resource × action. La RLS hace cumplir esto
// del lado server; replicamos acá para que la UI no muestre botones que
// el server iba a rechazar igual.
//
// Sintaxis: PERMS[rol][resource] = { list, show, create, edit, delete }
// "*" se aplica a todo resource no listado explícitamente.

const PERMS = {
  super_admin: {
    "*": { list: true, show: true, create: true, edit: true, delete: true },
    // Dashboard read-only (views agregadas)
    dashboard_funnel: { list: true, show: false, create: false, edit: false, delete: false },
    // Crear users via CLI (make admin-create-user), no desde UI.
    profiles: { list: true, show: true, create: false, edit: true, delete: false },
    // Votos son agregados readonly.
    votos_fecha: { list: true, show: true, create: false, edit: false, delete: false },
    votos_plan:  { list: true, show: true, create: false, edit: false, delete: false },
    // Super NO crea ventas — solo transita estados (pagada/liquidada).
    ventas: { list: true, show: true, create: false, edit: true, delete: true },
    // Leads: super gestiona, empresa no ve.
    leads: { list: true, show: true, create: false, edit: true, delete: true },
    lead_actividades: { list: true, show: true, create: true, edit: true, delete: true },
  },
  empresa_admin: {
    // Ciudades es catálogo público: read-only para empresa_admin.
    ciudades:           { list: true, show: true, create: false, edit: false, delete: false },
    empresas_origenes:  { list: true, show: true, create: true, edit: true, delete: true },
    destinos:       { list: true, show: true, create: true, edit: true, delete: true },
    planes_viaje:   { list: true, show: true, create: true, edit: true, delete: true },
    documentos:     { list: true, show: true, create: true, edit: false, delete: true },
    fechas_reunion: { list: true, show: true, create: true, edit: true, delete: true },
    mensajes:       { list: true, show: true, create: true, edit: false, delete: false },
    ventas:         { list: true, show: true, create: true, edit: true, delete: false },
    votos_fecha:    { list: true, show: true, create: false, edit: false, delete: false },
    votos_plan:     { list: true, show: true, create: false, edit: false, delete: false },
    correcciones:   { list: true, show: true, create: false, edit: true, delete: false },
    // Resto: implícitamente false (gobierno no accesible).
  },
};

let cachedRol = null;
async function getRol() {
  if (cachedRol) return cachedRol;
  const { data } = await supabaseClient.auth.getSession();
  if (!data?.session?.user) return null;
  const { data: prof } = await supabaseClient
    .from("profiles").select("rol").eq("user_id", data.session.user.id).maybeSingle();
  cachedRol = prof?.rol || null;
  return cachedRol;
}

// Reset al logout (lo invoca authProvider; importado lazy para evitar ciclo).
export function resetAccessControlCache() {
  cachedRol = null;
}

export const accessControlProvider = {
  can: async ({ resource, action }) => {
    if (!resource) return { can: true }; // virtuales del sidebar (gobierno, oferta, etc)
    const rol = await getRol();
    if (!rol) return { can: false };

    const rules = PERMS[rol] || {};
    const rule = rules[resource] || rules["*"];
    if (!rule) return { can: false, reason: "Recurso no permitido para este rol" };
    return { can: !!rule[action] };
  },
};
