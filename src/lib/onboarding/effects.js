// Side-effects del onboarding aislados detrás de funciones puras (con
// respecto al view). El view llama estas funciones, espera el resultado y
// recién ahí dispatcha el evento a la FSM. Los tests pueden mockear este
// módulo por completo sin tocar la FSM.

import { supabase } from "../../supabase";

// ---------------------------------------------------------------
// Catálogo (read-only)
// ---------------------------------------------------------------

export async function fetchEscuelas() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("escuelas")
    .select("id, nombre, localidad, ciudad_id, ciudades(id, nombre, provincia)")
    .order("nombre");
  if (error) throw error;
  return data || [];
}

export async function fetchCiudades() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ciudades")
    .select("id, nombre, provincia, slug")
    .order("provincia").order("nombre");
  if (error) throw error;
  return data || [];
}

export async function fetchGruposByEscuela(escuelaId) {
  if (!supabase || !escuelaId) return [];
  const { data, error } = await supabase
    .from("grupos")
    .select("id, anio_egreso, grado")
    .eq("escuela_id", escuelaId)
    .eq("estado", "activo")
    .order("anio_egreso", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------
// Auto-creación de escuela/grupo pendientes (security definer RPCs)
// ---------------------------------------------------------------

export async function createEscuelaPendiente({ nombre, localidad = null, provincia = null, ciudadId = null }) {
  const { data, error } = await supabase.rpc("escuela_lead_create", {
    p_nombre: nombre, p_localidad: localidad, p_provincia: provincia,
    p_ciudad_id: ciudadId,
  });
  if (error) throw error;
  return data;
}

export async function createGrupoPendiente({ escuela_id, grado, anio_egreso }) {
  const { data, error } = await supabase.rpc("grupo_lead_create", {
    p_escuela_id: escuela_id, p_grado: grado || "", p_anio_egreso: anio_egreso,
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------
// Lead CRM (upsert idempotente via RPC security definer)
// ---------------------------------------------------------------

export async function upsertLead({ id = null, email, apellido = null, telefono = null,
                                   escuela_id = null, escuela_libre = null,
                                   grado_buscado = null, anio_egreso = null,
                                   familia_id = null,
                                   utm_source = null, utm_medium = null,
                                   utm_campaign = null, utm_term = null, utm_content = null }) {
  if (!supabase || !email) return null;
  const { data, error } = await supabase.rpc("lead_upsert", {
    p_id: id, p_email: email, p_apellido: apellido, p_telefono: telefono,
    p_escuela_id: escuela_id, p_escuela_libre: escuela_libre,
    p_grado_buscado: grado_buscado, p_anio_egreso: anio_egreso,
    p_familia_id: familia_id,
    p_utm_source: utm_source, p_utm_medium: utm_medium,
    p_utm_campaign: utm_campaign, p_utm_term: utm_term, p_utm_content: utm_content,
  });
  if (error) { console.warn("lead_upsert:", error.message); return id; }
  return data || id;
}

// ---------------------------------------------------------------
// Familia + auth anónima
// ---------------------------------------------------------------

export async function findOrCreateFamilia({ grupo_id, apellido, email, telefono }) {
  const { data: existing } = await supabase
    .from("familias").select("id")
    .eq("grupo_id", grupo_id).ilike("apellido", apellido).limit(1);
  if (existing?.[0]?.id) return existing[0].id;

  const { data, error } = await supabase
    .from("familias")
    .insert({ grupo_id, apellido, email: email || null, telefono: telefono || null })
    .select("id").single();
  if (error) throw error;
  return data.id;
}

export async function signInAnonAndLinkProfile({ familia_id }) {
  const { data: { session }, error: errSign } = await supabase.auth.signInAnonymously();
  if (errSign) throw errSign;
  const user = session?.user;
  if (!user) throw new Error("No session after anon sign-in");
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, rol: "familia", familia_id }, { onConflict: "user_id" });
  if (error) throw error;
  return user.id;
}
