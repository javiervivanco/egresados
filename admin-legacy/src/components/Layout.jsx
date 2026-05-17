import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Building2, Briefcase, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Layout({ profile, children }) {
  const navigate = useNavigate();
  const isSuper = profile.rol === "super_admin";

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const linkCls = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive ? "bg-pino text-white" : "text-stone-600 hover:bg-stone-100"
    }`;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <h1 className="font-serif text-xl text-noche">Egresados · Admin</h1>
          <nav className="flex items-center gap-1 ml-4">
            {isSuper && (
              <NavLink to="/super" className={linkCls}>
                <Building2 className="w-4 h-4" /> Super-admin
              </NavLink>
            )}
            <NavLink to="/empresa" className={linkCls}>
              <Briefcase className="w-4 h-4" /> Empresa
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-stone-500">
              {profile.nombre} <span className="text-stone-400">· {profile.rol}</span>
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-stone-500 hover:text-tierra"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
