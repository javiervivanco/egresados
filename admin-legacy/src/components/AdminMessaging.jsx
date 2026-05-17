import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabase";

// Mensajería del lado empresa. Lista grupos con los que la empresa tuvo
// contacto (fechas_reunion o mensajes previos) y permite abrir hilo.
export default function AdminMessaging({ empresaId, empresaNombre }) {
  const [grupos, setGrupos] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHilos = useCallback(async () => {
    setLoading(true);
    const [{ data: dFechas }, { data: dMensajes }] = await Promise.all([
      supabase.from("fechas_reunion").select("grupo_id, grupos(grado, anio_egreso, escuelas(nombre))").eq("empresa_id", empresaId),
      supabase.from("mensajes").select("grupo_id, grupos:grupo_id(grado, anio_egreso, escuelas(nombre)), leido_empresa").eq("empresa_id", empresaId),
    ]);

    const byId = new Map();
    for (const r of (dFechas || [])) {
      if (!byId.has(r.grupo_id)) byId.set(r.grupo_id, {
        grupo_id: r.grupo_id,
        label: `${r.grupos?.escuelas?.nombre || ""} · ${r.grupos?.grado || ""} (${r.grupos?.anio_egreso})`,
        sin_leer: 0,
      });
    }
    for (const r of (dMensajes || [])) {
      const e = byId.get(r.grupo_id) || {
        grupo_id: r.grupo_id,
        label: `${r.grupos?.escuelas?.nombre || ""} · ${r.grupos?.grado || ""} (${r.grupos?.anio_egreso})`,
        sin_leer: 0,
      };
      if (r.leido_empresa === false) e.sin_leer++;
      byId.set(r.grupo_id, e);
    }
    setGrupos([...byId.values()].sort((a, b) => a.label.localeCompare(b.label)));
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { loadHilos(); }, [loadHilos]);

  if (loading) return null;

  return (
    <section className="bg-white rounded-xl border border-stone-200 p-5">
      <header className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-pino" />
        <h3 className="font-serif text-lg text-noche">Mensajes con grupos</h3>
      </header>
      {grupos.length === 0 ? (
        <p className="text-sm text-stone-400">Sin conversaciones todavía. Las conversaciones se abren cuando proponés una fecha o el grupo te escribe.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {grupos.map((g) => (
            <li key={g.grupo_id}>
              <button
                onClick={() => setOpenId(openId === g.grupo_id ? null : g.grupo_id)}
                className="w-full flex items-center gap-2 py-2 text-left"
              >
                <GraduationCap className="w-4 h-4 text-stone-500" />
                <span className="font-semibold text-noche text-sm flex-1">{g.label}</span>
                {g.sin_leer > 0 && (
                  <span className="bg-tierra text-white text-[11px] font-bold rounded-full px-2 py-0.5">{g.sin_leer}</span>
                )}
                {openId === g.grupo_id ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
              </button>
              {openId === g.grupo_id && (
                <AdminThread
                  empresaId={empresaId}
                  empresaNombre={empresaNombre}
                  grupoId={g.grupo_id}
                  onChange={loadHilos}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AdminThread({ empresaId, empresaNombre, grupoId, onChange }) {
  const [mensajes, setMensajes] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("mensajes")
      .select("id, autor_rol, autor_nombre, contenido, created_at, leido_empresa")
      .eq("grupo_id", grupoId).eq("empresa_id", empresaId)
      .order("created_at");
    setMensajes(data || []);

    // Marcar como leídos los que vienen de la familia.
    const noLeidos = (data || []).filter((m) => m.autor_rol === "familia" && !m.leido_empresa);
    if (noLeidos.length > 0) {
      await supabase.from("mensajes")
        .update({ leido_empresa: true })
        .in("id", noLeidos.map((m) => m.id));
      onChange?.();
    }
  }, [empresaId, grupoId, onChange]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("mensajes").insert({
      grupo_id: grupoId,
      empresa_id: empresaId,
      autor_rol: "empresa",
      autor_nombre: empresaNombre,
      contenido: text,
    });
    setSending(false);
    if (error) { alert(error.message); return; }
    setDraft("");
    load();
  };

  return (
    <div className="bg-stone-50 rounded-lg px-3 py-3 mb-2 space-y-2 border border-stone-200">
      <ul className="space-y-2 max-h-72 overflow-y-auto">
        {mensajes.map((m) => (
          <li key={m.id} className={`flex ${m.autor_rol === "empresa" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.autor_rol === "empresa"
                ? "bg-pino text-white rounded-br-sm"
                : "bg-white text-noche border border-stone-200 rounded-bl-sm"
            }`}>
              <p className="text-[10.5px] opacity-70 mb-0.5">
                {m.autor_nombre} · {new Date(m.created_at).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="whitespace-pre-wrap">{m.contenido}</p>
            </div>
          </li>
        ))}
        {mensajes.length === 0 && <li className="text-xs text-stone-400 text-center py-3">No hay mensajes todavía.</li>}
      </ul>
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escribí un mensaje…"
          rows={2}
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-pino bg-white"
        />
        <button onClick={send} disabled={!draft.trim() || sending}
          className="bg-pino text-white px-3 rounded-lg disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
