import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { LogIn } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-pino/10 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6 text-pino" />
          </div>
          <h1 className="font-serif text-2xl text-noche">Egresados · Admin</h1>
          <p className="text-stone-500 text-sm mt-1">Ingresá con tu cuenta administrativa.</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            required
            placeholder="email@empresa.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-pino"
          />
          <input
            type="password"
            required
            placeholder="contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-pino"
          />
        </div>

        {error && <p className="text-tierra text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pino text-white rounded-xl py-3 font-semibold disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p className="text-[11px] text-stone-400 text-center">
          Dev local: <code>admin@egresados.local</code> / <code>Admin123!</code>
        </p>
      </form>
    </div>
  );
}
