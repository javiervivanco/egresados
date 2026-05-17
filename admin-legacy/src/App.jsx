import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Login from "./components/Login.jsx";
import Layout from "./components/Layout.jsx";
import SuperAdminPage from "./pages/SuperAdmin.jsx";
import EmpresaAdminPage from "./pages/EmpresaAdmin.jsx";

// Hook que devuelve { session, profile, loading }. Cualquier cambio en auth
// (login/logout, refresh de token) re-fetchea el profile.
function useSessionProfile() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (s) => {
      if (!s?.user) { setProfile(null); return; }
      const { data } = await supabase
        .from("profiles")
        .select("user_id, rol, nombre, empresa_id, familia_id")
        .eq("user_id", s.user.id)
        .maybeSingle();
      if (active) setProfile(data || null);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      load(data.session).finally(() => active && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      load(s);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { session, profile, loading };
}

export default function App() {
  const { session, profile, loading } = useSessionProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !session || !profile) return;
    // Redirección inicial según rol — solo si estamos en "/".
    if (window.location.pathname === "/") {
      if (profile.rol === "super_admin") navigate("/super", { replace: true });
      else if (profile.rol === "empresa_admin") navigate("/empresa", { replace: true });
    }
  }, [loading, session, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500 text-sm">Cargando…</p>
      </div>
    );
  }

  if (!session) return <Login />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-noche font-semibold mb-2">Tu cuenta no tiene un perfil cargado.</p>
          <p className="text-stone-500 text-sm mb-4">
            Pedile al super-administrador que te asigne un rol y reintentá.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-pino underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout profile={profile}>
      <Routes>
        <Route path="/super/*" element={
          profile.rol === "super_admin"
            ? <SuperAdminPage />
            : <Navigate to="/empresa" replace />
        } />
        <Route path="/empresa/*" element={
          profile.rol === "empresa_admin" || profile.rol === "super_admin"
            ? <EmpresaAdminPage profile={profile} />
            : <Navigate to="/super" replace />
        } />
        <Route path="*" element={
          <Navigate to={profile.rol === "super_admin" ? "/super" : "/empresa"} replace />
        } />
      </Routes>
    </Layout>
  );
}
