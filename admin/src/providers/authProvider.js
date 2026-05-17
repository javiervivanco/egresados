import { supabaseClient } from "../lib/supabaseClient";

// Cache del profile vivo durante la sesión. Se actualiza en login/check para
// evitar round-trips en cada llamada a getPermissions/getIdentity (Refine las
// invoca seguido por hooks/sidebar).
let cachedProfile = null;

async function fetchProfile(userId) {
  const { data } = await supabaseClient
    .from("profiles")
    .select("user_id, rol, nombre, empresa_id, familia_id, empresas(nombre)")
    .eq("user_id", userId)
    .maybeSingle();
  cachedProfile = data || null;
  return cachedProfile;
}

export const authProvider = {
  login: async ({ email, password }) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: { name: "Login error", message: error.message } };
    if (!data?.user) return { success: false, error: { name: "Login error", message: "Sin usuario" } };

    const profile = await fetchProfile(data.user.id);
    if (!profile) {
      await supabaseClient.auth.signOut();
      cachedProfile = null;
      return {
        success: false,
        error: {
          name: "Sin perfil",
          message: "Tu cuenta no tiene perfil. Pedile al super-admin que te asigne rol.",
        },
      };
    }
    if (profile.rol !== "super_admin" && profile.rol !== "empresa_admin") {
      await supabaseClient.auth.signOut();
      cachedProfile = null;
      return {
        success: false,
        error: { name: "Acceso denegado", message: "Esta cuenta no tiene acceso administrativo." },
      };
    }
    return { success: true, redirectTo: "/" };
  },

  logout: async () => {
    await supabaseClient.auth.signOut();
    cachedProfile = null;
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (!data?.session?.user) {
      cachedProfile = null;
      return { authenticated: false, redirectTo: "/login", logout: true };
    }
    if (!cachedProfile) await fetchProfile(data.session.user.id);
    if (!cachedProfile || (cachedProfile.rol !== "super_admin" && cachedProfile.rol !== "empresa_admin")) {
      await supabaseClient.auth.signOut();
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
        error: { name: "Sin perfil", message: "Cuenta sin perfil administrativo cargado." },
      };
    }
    return { authenticated: true };
  },

  onError: async (error) => {
    if (error?.status === 401 || error?.code === "PGRST301") {
      return { logout: true, redirectTo: "/login" };
    }
    return { error };
  },

  getPermissions: async () => {
    if (!cachedProfile) {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user) await fetchProfile(data.session.user.id);
    }
    if (!cachedProfile) return null;
    return {
      rol: cachedProfile.rol,
      empresa_id: cachedProfile.empresa_id,
      user_id: cachedProfile.user_id,
    };
  },

  getIdentity: async () => {
    if (!cachedProfile) {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user) await fetchProfile(data.session.user.id);
    }
    if (!cachedProfile) return null;
    return {
      id: cachedProfile.user_id,
      name: cachedProfile.nombre || "(sin nombre)",
      rol: cachedProfile.rol,
      empresa_id: cachedProfile.empresa_id,
      empresa_nombre: cachedProfile.empresas?.nombre,
    };
  },
};
