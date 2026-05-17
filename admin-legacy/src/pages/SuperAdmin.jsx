import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Building2, GraduationCap, DollarSign, Users, MessageCircleWarning, UserCog, Pencil, Trash2, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import SuperVentas from "../components/SuperVentas.jsx";

export default function SuperAdminPage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-serif text-2xl text-noche flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6 text-pino" /> Comisiones
        </h2>
        <SuperVentas />
      </section>
      <EmpresasSection />
      <EscuelasSection />
      <FamiliasSection />
      <UsuariosSection />
      <CorreccionesSection />
    </div>
  );
}

// ============================================================
// Empresas: CRUD completo
// ============================================================
function EmpresasSection() {
  const [empresas, setEmpresas] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("empresas").select("*").order("nombre");
    setEmpresas(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!confirm("¿Eliminar empresa? Borra también sus destinos/planes/ventas.")) return;
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <Section title="Empresas" icon={Building2} onNew={() => setCreating((v) => !v)}>
      {creating && <EmpresaForm onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}
      <ul className="divide-y divide-stone-100">
        {empresas.map((e) => editingId === e.id ? (
          <li key={e.id} className="py-2">
            <EmpresaForm empresa={e} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
          </li>
        ) : (
          <li key={e.id} className="py-2 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-noche">{e.nombre}</p>
              <p className="text-xs text-stone-500">{e.slug} · {e.contacto_email || "sin contacto"} · comisión {e.comision_pct_default}%</p>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded ${e.activo ? "bg-pino/10 text-pino" : "bg-stone-100 text-stone-500"}`}>{e.activo ? "activa" : "inactiva"}</span>
            <RowActions onEdit={() => setEditingId(e.id)} onDelete={() => remove(e.id)} />
          </li>
        ))}
        {empresas.length === 0 && <li className="py-3 text-sm text-stone-400">Sin empresas todavía.</li>}
      </ul>
    </Section>
  );
}

function EmpresaForm({ empresa = null, onSaved, onCancel }) {
  const [form, setForm] = useState(empresa || { nombre: "", slug: "", contacto_email: "", contacto_tel: "", comision_pct_default: 8, activo: true });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, comision_pct_default: Number(form.comision_pct_default) };
    const q = empresa
      ? supabase.from("empresas").update(payload).eq("id", empresa.id)
      : supabase.from("empresas").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-stone-50 p-3 rounded-lg my-2">
      <input required placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input required placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input placeholder="contacto@empresa.com" value={form.contacto_email || ""} onChange={(e) => setForm({ ...form, contacto_email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input placeholder="Teléfono" value={form.contacto_tel || ""} onChange={(e) => setForm({ ...form, contacto_tel: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input type="number" step="0.01" placeholder="Comisión %" value={form.comision_pct_default} onChange={(e) => setForm({ ...form, comision_pct_default: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={!!form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activa
      </label>
      <FormActions saving={saving} onCancel={onCancel} editing={!!empresa} />
    </form>
  );
}

// ============================================================
// Escuelas + Grupos (CRUD anidado)
// ============================================================
function EscuelasSection() {
  const [escuelas, setEscuelas] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const load = useCallback(async () => {
    const { data } = await supabase.from("escuelas").select("*, grupos(id, anio_egreso, grado, estado)").order("nombre");
    setEscuelas(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!confirm("¿Eliminar escuela y todos sus grupos/familias?")) return;
    const { error } = await supabase.from("escuelas").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  const toggle = (id) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };

  return (
    <Section title="Escuelas" icon={GraduationCap} onNew={() => setCreating((v) => !v)}>
      {creating && <EscuelaForm onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}
      <ul className="divide-y divide-stone-100">
        {escuelas.map((e) => (
          <li key={e.id} className="py-2">
            {editingId === e.id ? (
              <EscuelaForm escuela={e} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(e.id)} className="text-stone-400">
                  {expanded.has(e.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1">
                  <p className="font-semibold text-noche">{e.nombre}</p>
                  <p className="text-xs text-stone-500">
                    {[e.localidad, e.provincia].filter(Boolean).join(", ") || "sin ubicación"}
                    {" · "}{e.grupos?.length || 0} {e.grupos?.length === 1 ? "grupo" : "grupos"}
                  </p>
                </div>
                <RowActions onEdit={() => setEditingId(e.id)} onDelete={() => remove(e.id)} />
              </div>
            )}
            {expanded.has(e.id) && <GruposNested escuelaId={e.id} grupos={e.grupos || []} onChange={load} />}
          </li>
        ))}
        {escuelas.length === 0 && <li className="py-3 text-sm text-stone-400">Sin escuelas todavía.</li>}
      </ul>
    </Section>
  );
}

function EscuelaForm({ escuela = null, onSaved, onCancel }) {
  const [form, setForm] = useState(escuela || { nombre: "", localidad: "", provincia: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const q = escuela
      ? supabase.from("escuelas").update(form).eq("id", escuela.id)
      : supabase.from("escuelas").insert(form);
    const { error } = await q;
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-stone-50 p-3 rounded-lg my-2">
      <input required placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input placeholder="Localidad" value={form.localidad || ""} onChange={(e) => setForm({ ...form, localidad: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input placeholder="Provincia" value={form.provincia || ""} onChange={(e) => setForm({ ...form, provincia: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <FormActions saving={saving} onCancel={onCancel} editing={!!escuela} />
    </form>
  );
}

function GruposNested({ escuelaId, grupos, onChange }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const remove = async (id) => {
    if (!confirm("¿Eliminar grupo y todas sus familias?")) return;
    const { error } = await supabase.from("grupos").delete().eq("id", id);
    if (error) return alert(error.message);
    onChange();
  };

  return (
    <div className="ml-6 mt-2 pl-4 border-l-2 border-stone-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">Grupos</p>
        <button onClick={() => setCreating((v) => !v)} className="text-xs flex items-center gap-1 text-pino">
          <Plus className="w-3 h-3" /> nuevo
        </button>
      </div>
      {creating && <GrupoForm escuelaId={escuelaId} onSaved={() => { setCreating(false); onChange(); }} onCancel={() => setCreating(false)} />}
      <ul className="space-y-1">
        {grupos.map((g) => editingId === g.id ? (
          <li key={g.id}><GrupoForm escuelaId={escuelaId} grupo={g} onSaved={() => { setEditingId(null); onChange(); }} onCancel={() => setEditingId(null)} /></li>
        ) : (
          <li key={g.id} className="flex items-center gap-2 text-sm py-1">
            <Users className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-semibold text-noche">{g.grado}</span>
            <span className="text-stone-500 text-xs">egreso {g.anio_egreso}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${g.estado === "activo" ? "bg-pino/10 text-pino" : "bg-stone-100 text-stone-500"}`}>{g.estado}</span>
            <div className="ml-auto"><RowActions onEdit={() => setEditingId(g.id)} onDelete={() => remove(g.id)} /></div>
          </li>
        ))}
        {grupos.length === 0 && <li className="text-xs text-stone-400 py-1">Sin grupos.</li>}
      </ul>
    </div>
  );
}

function GrupoForm({ escuelaId, grupo = null, onSaved, onCancel }) {
  const [form, setForm] = useState(grupo || { anio_egreso: new Date().getFullYear() + 1, grado: "", estado: "activo" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, escuela_id: escuelaId, anio_egreso: Number(form.anio_egreso) };
    const q = grupo
      ? supabase.from("grupos").update(payload).eq("id", grupo.id)
      : supabase.from("grupos").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white p-2 rounded-lg my-1 border border-stone-200">
      <input required placeholder="Grado (ej: 6to A)" value={form.grado} onChange={(e) => setForm({ ...form, grado: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
      <input required type="number" placeholder="Año egreso" value={form.anio_egreso} onChange={(e) => setForm({ ...form, anio_egreso: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
      <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="border rounded px-2 py-1.5 text-sm">
        <option value="activo">activo</option>
        <option value="cerrado">cerrado</option>
      </select>
      <FormActions saving={saving} onCancel={onCancel} editing={!!grupo} compact />
    </form>
  );
}

// ============================================================
// Familias (lista global, agrupada por escuela+grupo)
// ============================================================
function FamiliasSection() {
  const [filas, setFilas] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("familias")
      .select("*, grupos!inner(grado, anio_egreso, escuelas!inner(nombre))")
      .order("apellido");
    setFilas(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!confirm("¿Eliminar familia y sus votos/mensajes?")) return;
    const { error } = await supabase.from("familias").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <Section title={`Familias (${filas.length})`} icon={Users}>
      {filas.length === 0 ? (
        <p className="text-sm text-stone-400">Sin familias registradas todavía.</p>
      ) : (
        <ul className="divide-y divide-stone-100 max-h-72 overflow-auto">
          {filas.map((f) => (
            <li key={f.id} className="py-2 flex items-center gap-3 text-sm">
              <div className="flex-1">
                <p className="font-semibold text-noche">{f.apellido}</p>
                <p className="text-xs text-stone-500">
                  {f.grupos?.escuelas?.nombre} · {f.grupos?.grado} ({f.grupos?.anio_egreso})
                  {f.email && <> · {f.email}</>}
                </p>
              </div>
              <button onClick={() => remove(f.id)} className="text-stone-400 hover:text-tierra" title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ============================================================
// Usuarios / Profiles
// ============================================================
function UsuariosSection() {
  const [profiles, setProfiles] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, rol, nombre, empresa_id, familia_id, empresas(nombre)")
      .order("rol");
    setProfiles(data || []);
  }, []);
  useEffect(() => {
    load();
    supabase.from("empresas").select("id, nombre").order("nombre").then(({ data }) => setEmpresas(data || []));
  }, [load]);

  const save = async (p) => {
    const { error } = await supabase
      .from("profiles")
      .update({ rol: p.rol, empresa_id: p.empresa_id || null, nombre: p.nombre })
      .eq("user_id", p.user_id);
    if (error) return alert(error.message);
    setEditing(null);
    load();
  };

  return (
    <Section title="Usuarios" icon={UserCog}>
      <p className="text-xs text-stone-400 mb-2">
        Para crear un nuevo administrador: <code className="bg-stone-100 px-1 rounded">make admin-create-user EMAIL=... ROL=...</code>
      </p>
      <ul className="divide-y divide-stone-100">
        {profiles.map((p) => editing?.user_id === p.user_id ? (
          <li key={p.user_id} className="py-2 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
            <input value={editing.nombre || ""} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} className="border rounded px-2 py-1 text-sm" placeholder="Nombre" />
            <select value={editing.rol} onChange={(e) => setEditing({ ...editing, rol: e.target.value })} className="border rounded px-2 py-1 text-sm">
              <option value="super_admin">super_admin</option>
              <option value="empresa_admin">empresa_admin</option>
              <option value="familia">familia</option>
            </select>
            <select value={editing.empresa_id || ""} onChange={(e) => setEditing({ ...editing, empresa_id: e.target.value ? Number(e.target.value) : null })} className="border rounded px-2 py-1 text-sm" disabled={editing.rol !== "empresa_admin"}>
              <option value="">— sin empresa —</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <div className="flex gap-1 justify-end">
              <button onClick={() => save(editing)} className="bg-pino text-white text-xs px-2 py-1 rounded"><Check className="w-3 h-3" /></button>
              <button onClick={() => setEditing(null)} className="bg-stone-200 text-xs px-2 py-1 rounded"><X className="w-3 h-3" /></button>
            </div>
          </li>
        ) : (
          <li key={p.user_id} className="py-2 flex items-center gap-3 text-sm">
            <div className="flex-1">
              <p className="font-semibold text-noche">{p.nombre || <span className="italic text-stone-400">sin nombre</span>}</p>
              <p className="text-xs text-stone-500">
                {p.rol}{p.empresas?.nombre && <> · {p.empresas.nombre}</>}
                <span className="ml-2 font-mono text-[10px] text-stone-400">{p.user_id.slice(0, 8)}…</span>
              </p>
            </div>
            <button onClick={() => setEditing({ ...p })} className="text-stone-400 hover:text-noche" title="Editar"><Pencil className="w-4 h-4" /></button>
          </li>
        ))}
        {profiles.length === 0 && <li className="py-3 text-sm text-stone-400">Sin perfiles.</li>}
      </ul>
    </Section>
  );
}

// ============================================================
// Correcciones reportadas
// ============================================================
function CorreccionesSection() {
  const [filas, setFilas] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("correcciones")
      .select("*, planes_viaje(plan_pago, destinos(nombre, empresas(nombre))), destinos(nombre, empresas(nombre))")
      .order("created_at", { ascending: false });
    setFilas(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setEstado = async (id, estado) => {
    const { error } = await supabase.from("correcciones").update({ estado }).eq("id", id);
    if (error) return alert(error.message);
    load();
  };
  const remove = async (id) => {
    if (!confirm("¿Eliminar corrección?")) return;
    await supabase.from("correcciones").delete().eq("id", id);
    load();
  };

  return (
    <Section title={`Correcciones (${filas.filter((f) => f.estado === "pendiente").length} pendientes)`} icon={MessageCircleWarning}>
      {filas.length === 0 ? (
        <p className="text-sm text-stone-400">Sin reportes.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {filas.map((f) => {
            const ctx = f.planes_viaje?.destinos || f.destinos;
            return (
              <li key={f.id} className="py-3 flex items-start gap-3 text-sm">
                <div className="flex-1">
                  <p className="text-stone-700">
                    <strong>{f.campo}</strong>: <span className="text-tierra">{f.valor_actual || "—"}</span> → <span className="text-pino">{f.valor_correcto || "—"}</span>
                  </p>
                  {f.comentario && <p className="text-xs text-stone-500 mt-0.5">{f.comentario}</p>}
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {ctx?.empresas?.nombre} · {ctx?.nombre}
                    {f.planes_viaje?.plan_pago && <> · {f.planes_viaje.plan_pago}</>}
                    {" · "}{new Date(f.created_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded ${
                  f.estado === "resuelta"  ? "bg-pino/10 text-pino" :
                  f.estado === "descartada" ? "bg-stone-100 text-stone-400 line-through" :
                  "bg-fogata/20 text-tierra"
                }`}>{f.estado}</span>
                {f.estado === "pendiente" && (
                  <>
                    <button onClick={() => setEstado(f.id, "resuelta")} className="text-xs bg-pino text-white px-2 py-1 rounded">Resolver</button>
                    <button onClick={() => setEstado(f.id, "descartada")} className="text-xs bg-stone-200 px-2 py-1 rounded">Descartar</button>
                  </>
                )}
                <button onClick={() => remove(f.id)} className="text-stone-400 hover:text-tierra"><Trash2 className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// ============================================================
// Helpers UI compartidos
// ============================================================
function Section({ title, icon: Icon, onNew, children }) {
  return (
    <section className="bg-white rounded-xl border border-stone-200 p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg text-noche flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-pino" />} {title}
        </h2>
        {onNew && (
          <button onClick={onNew} className="flex items-center gap-1 text-sm bg-pino text-white px-3 py-1.5 rounded-lg">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1">
      {onEdit && <button onClick={onEdit} className="text-stone-400 hover:text-noche" title="Editar"><Pencil className="w-4 h-4" /></button>}
      {onDelete && <button onClick={onDelete} className="text-stone-400 hover:text-tierra" title="Eliminar"><Trash2 className="w-4 h-4" /></button>}
    </div>
  );
}

function FormActions({ saving, onCancel, editing, compact = false }) {
  return (
    <div className={`flex gap-2 justify-end ${compact ? "" : "sm:col-span-3"}`}>
      <button type="button" onClick={onCancel} className="text-sm text-stone-500 px-3 py-1">Cancelar</button>
      <button disabled={saving} className="bg-pino text-white text-sm px-4 py-1 rounded-lg">
        {saving ? "…" : editing ? "Guardar" : "Crear"}
      </button>
    </div>
  );
}
