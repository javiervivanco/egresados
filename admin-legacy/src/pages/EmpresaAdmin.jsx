import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  Plus, MapPin, FileText, Upload, Sparkles, Bus, Plane,
  Loader2, CheckCircle2, CalendarClock, X, Pencil, Trash2, Check,
  Eye, EyeOff,
} from "lucide-react";
import AdminMessaging from "../components/AdminMessaging.jsx";
import VentasSection from "../components/VentasSection.jsx";

export default function EmpresaAdminPage({ profile }) {
  const [empresaId, setEmpresaId] = useState(profile.empresa_id);
  const [empresa, setEmpresa] = useState(null);
  const [allEmpresas, setAllEmpresas] = useState([]);

  useEffect(() => {
    if (profile.rol !== "super_admin") return;
    supabase.from("empresas").select("id,nombre").order("nombre").then(({ data }) => {
      setAllEmpresas(data || []);
      if (!empresaId && data?.length) setEmpresaId(data[0].id);
    });
  }, [profile.rol, empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle()
      .then(({ data }) => setEmpresa(data));
  }, [empresaId]);

  if (!empresaId) return <p className="text-stone-500 text-sm">Sin empresa asignada.</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-noche">{empresa?.nombre || "…"}</h2>
          <p className="text-stone-500 text-sm">Gestioná destinos, planes y documentos.</p>
        </div>
        {profile.rol === "super_admin" && allEmpresas.length > 1 && (
          <select value={empresaId} onChange={(e) => setEmpresaId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
            {allEmpresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        )}
      </header>

      <DestinosSection empresaId={empresaId} />
      <FechasReunionSection empresaId={empresaId} />
      <AdminMessaging empresaId={empresaId} empresaNombre={empresa?.nombre || "Empresa"} />
      <VentasSection empresaId={empresaId} comisionDefault={empresa?.comision_pct_default ?? 8} />
    </div>
  );
}

// ============================================================
// Destinos (CRUD completo)
// ============================================================
function DestinosSection({ empresaId }) {
  const [destinos, setDestinos] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from("destinos").select("*").eq("empresa_id", empresaId).order("nombre");
    if (!showInactive) q = q.eq("activo", true);
    const { data } = await q;
    setDestinos(data || []);
  }, [empresaId, showInactive]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!confirm("¿Eliminar destino y todos sus planes/documentos?")) return;
    const { error } = await supabase.from("destinos").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  const toggleActivo = async (d) => {
    await supabase.from("destinos").update({ activo: !d.activo }).eq("id", d.id);
    load();
  };

  return (
    <section className="bg-white rounded-xl border border-stone-200 p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg text-noche flex items-center gap-2">
          <MapPin className="w-5 h-5 text-pino" /> Destinos
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInactive((v) => !v)} className="text-xs text-stone-500 underline">
            {showInactive ? "Ocultar inactivos" : "Ver inactivos"}
          </button>
          <button onClick={() => setCreating((v) => !v)} className="flex items-center gap-1 text-sm bg-pino text-white px-3 py-1.5 rounded-lg">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </header>

      {creating && (
        <DestinoForm empresaId={empresaId} onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />
      )}

      <div className="space-y-3">
        {destinos.map((d) => editingId === d.id ? (
          <DestinoForm key={d.id} empresaId={empresaId} destino={d} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
        ) : (
          <DestinoCard key={d.id} destino={d} onEdit={() => setEditingId(d.id)} onDelete={() => remove(d.id)} onToggleActivo={() => toggleActivo(d)} onChange={load} />
        ))}
        {destinos.length === 0 && <p className="text-sm text-stone-400">Sin destinos. Creá el primero.</p>}
      </div>
    </section>
  );
}

function DestinoForm({ empresaId, destino = null, onSaved, onCancel }) {
  const [form, setForm] = useState(destino || { nombre: "", provincia: "", descripcion: "", activo: true });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, empresa_id: empresaId };
    const q = destino
      ? supabase.from("destinos").update(payload).eq("id", destino.id)
      : supabase.from("destinos").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-stone-50 p-3 rounded-lg mb-3">
      <input required placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input placeholder="Provincia" value={form.provincia || ""} onChange={(e) => setForm({ ...form, provincia: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input placeholder="Descripción" value={form.descripcion || ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <div className="sm:col-span-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-stone-500 px-3 py-1">Cancelar</button>
        <button disabled={saving} className="bg-pino text-white text-sm px-4 py-1 rounded-lg">
          {saving ? "…" : destino ? "Guardar" : "Crear"}
        </button>
      </div>
    </form>
  );
}

function DestinoCard({ destino, onEdit, onDelete, onToggleActivo, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-lg ${destino.activo ? "border-stone-200" : "border-stone-200 bg-stone-50 opacity-70"}`}>
      <div className="px-4 py-3 flex items-center gap-2">
        <button onClick={() => setOpen((v) => !v)} className="text-left flex-1">
          <p className="font-semibold text-noche">{destino.nombre} {!destino.activo && <span className="text-xs text-stone-400">(inactivo)</span>}</p>
          <p className="text-xs text-stone-500">{destino.provincia || "sin provincia"}</p>
        </button>
        <button onClick={onToggleActivo} className="text-stone-400 hover:text-noche" title={destino.activo ? "Desactivar" : "Activar"}>
          {destino.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={onEdit} className="text-stone-400 hover:text-noche"><Pencil className="w-4 h-4" /></button>
        <button onClick={onDelete} className="text-stone-400 hover:text-tierra"><Trash2 className="w-4 h-4" /></button>
      </div>
      {open && (
        <div className="border-t border-stone-200 p-4 space-y-5 bg-white">
          <PlanesSection destinoId={destino.id} />
          <DocumentosSection destinoId={destino.id} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Planes (CRUD completo)
// ============================================================
function PlanesSection({ destinoId }) {
  const [planes, setPlanes] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("planes_viaje").select("*").eq("destino_id", destinoId).order("plan_pago");
    setPlanes(data || []);
  }, [destinoId]);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!confirm("¿Eliminar plan?")) return;
    const { error } = await supabase.from("planes_viaje").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-noche">Planes de viaje ({planes.length})</h4>
        <button onClick={() => setCreating((v) => !v)} className="text-xs flex items-center gap-1 text-pino">
          <Plus className="w-3 h-3" /> nuevo
        </button>
      </header>

      {creating && <PlanForm destinoId={destinoId} onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}

      <ul className="text-sm text-stone-700 space-y-1">
        {planes.map((p) => editingId === p.id ? (
          <li key={p.id}><PlanForm destinoId={destinoId} plan={p} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} /></li>
        ) : (
          <li key={p.id} className="flex items-center gap-2 py-1 border-b border-stone-100 last:border-0">
            {p.transporte === "Avión" ? <Plane className="w-3.5 h-3.5" /> : p.transporte === "Bus" ? <Bus className="w-3.5 h-3.5" /> : <span className="w-3.5" />}
            <span className="flex-1">{p.plan_pago || "—"}</span>
            <span className="text-stone-500 text-xs">{p.dias}d/{p.noches}n</span>
            <span className="text-stone-500 text-xs">$ {p.total_final?.toLocaleString("es-AR") || "—"}</span>
            <button onClick={() => setEditingId(p.id)} className="text-stone-400 hover:text-noche"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => remove(p.id)} className="text-stone-400 hover:text-tierra"><Trash2 className="w-3.5 h-3.5" /></button>
          </li>
        ))}
        {planes.length === 0 && <li className="text-stone-400 text-xs py-1">Sin planes todavía.</li>}
      </ul>
    </div>
  );
}

const emptyPlan = () => ({
  transporte: "", plan_pago: "", dias: "", noches: "",
  cantidad_cuotas: "", cuota_mensual: "", inscripcion: "", primera_cuota: "",
  reserva: "", anticipo_saldo: "", total_final: "",
  liberados: "", seguro: "", descuentos: "", actividades: "", vigencia: "",
});

function PlanForm({ destinoId, plan = null, onSaved, onCancel }) {
  const [form, setForm] = useState(plan || emptyPlan());
  const [saving, setSaving] = useState(false);

  const setNum = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, destino_id: destinoId };
    for (const k of Object.keys(payload)) if (payload[k] === "") payload[k] = null;
    const q = plan
      ? supabase.from("planes_viaje").update(payload).eq("id", plan.id)
      : supabase.from("planes_viaje").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="bg-stone-50 border border-stone-200 rounded-lg p-3 my-1 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <select value={form.transporte || ""} onChange={setNum("transporte")} className="border rounded px-2 py-1">
          <option value="">Transporte</option>
          <option value="Bus">Bus</option>
          <option value="Avión">Avión</option>
        </select>
        <input placeholder="Plan_Pago" value={form.plan_pago || ""} onChange={setNum("plan_pago")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Días" value={form.dias || ""} onChange={setNum("dias")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Noches" value={form.noches || ""} onChange={setNum("noches")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Cuotas" value={form.cantidad_cuotas || ""} onChange={setNum("cantidad_cuotas")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Cuota mensual" value={form.cuota_mensual || ""} onChange={setNum("cuota_mensual")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Inscripción" value={form.inscripcion || ""} onChange={setNum("inscripcion")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Primera cuota" value={form.primera_cuota || ""} onChange={setNum("primera_cuota")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Reserva" value={form.reserva || ""} onChange={setNum("reserva")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Anticipo saldo" value={form.anticipo_saldo || ""} onChange={setNum("anticipo_saldo")} className="border rounded px-2 py-1" />
        <input type="number" placeholder="Total final" value={form.total_final || ""} onChange={setNum("total_final")} className="border rounded px-2 py-1" />
        <input placeholder="Vigencia" value={form.vigencia || ""} onChange={setNum("vigencia")} className="border rounded px-2 py-1" />
      </div>
      <textarea placeholder="Actividades (separadas por coma)" rows={2} value={form.actividades || ""} onChange={setNum("actividades")} className="w-full border rounded px-2 py-1 text-sm" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input placeholder="Liberados" value={form.liberados || ""} onChange={setNum("liberados")} className="border rounded px-2 py-1 text-sm" />
        <input placeholder="Seguro" value={form.seguro || ""} onChange={setNum("seguro")} className="border rounded px-2 py-1 text-sm" />
        <input placeholder="Descuentos" value={form.descuentos || ""} onChange={setNum("descuentos")} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm text-stone-500 px-3 py-1">Cancelar</button>
        <button disabled={saving} className="bg-pino text-white text-sm px-4 py-1 rounded">
          {saving ? "…" : plan ? "Guardar" : "Crear"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Documentos (upload, delete, ver datos_extraidos)
// ============================================================
function DocumentosSection({ destinoId }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("documentos").select("*").eq("destino_id", destinoId).order("created_at", { ascending: false });
    setDocs(data || []);
  }, [destinoId]);
  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const path = `destino_${destinoId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
    if (upErr) { alert(upErr.message); setUploading(false); return; }

    const { data: inserted, error: insErr } = await supabase
      .from("documentos")
      .insert({ destino_id: destinoId, nombre: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size, procesado_estado: "pendiente" })
      .select().single();
    if (insErr) { alert(insErr.message); setUploading(false); return; }

    setUploading(false);
    e.target.value = "";
    load();
    runMockIA(inserted.id, file.name).then(load);
  };

  const remove = async (doc) => {
    if (!confirm("¿Eliminar documento?")) return;
    await supabase.storage.from("documentos").remove([doc.storage_path]);
    await supabase.from("documentos").delete().eq("id", doc.id);
    load();
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-noche mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" /> Documentos ({docs.length})
      </h4>
      <ul className="text-sm space-y-1 mb-3">
        {docs.map((d) => (
          <li key={d.id} className="border-b border-stone-100 last:border-0">
            <div className="flex items-center gap-2 py-1.5">
              <DocStateIcon estado={d.procesado_estado} />
              <span className="truncate flex-1">{d.nombre}</span>
              <span className="text-xs text-stone-500">{d.procesado_estado}</span>
              {d.datos_extraidos && (
                <button onClick={() => setOpenId(openId === d.id ? null : d.id)} className="text-stone-400 hover:text-noche" title="Ver datos extraídos">
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => remove(d)} className="text-stone-400 hover:text-tierra"><Trash2 className="w-4 h-4" /></button>
            </div>
            {openId === d.id && d.datos_extraidos && (
              <pre className="bg-stone-50 border border-stone-200 rounded p-2 text-[11px] text-stone-700 overflow-auto mb-2">
                {JSON.stringify(d.datos_extraidos, null, 2)}
              </pre>
            )}
          </li>
        ))}
        {docs.length === 0 && <li className="text-stone-400 text-xs">Sin documentos.</li>}
      </ul>
      <label className="inline-flex items-center gap-2 bg-fogata text-noche px-3 py-1.5 rounded-lg cursor-pointer text-sm">
        <Upload className="w-4 h-4" />
        {uploading ? "Subiendo…" : "Subir PDF/imagen"}
        <input type="file" hidden onChange={handleUpload} disabled={uploading} accept="application/pdf,image/*" />
      </label>
    </div>
  );
}

function DocStateIcon({ estado }) {
  if (estado === "procesado") return <CheckCircle2 className="w-4 h-4 text-pino" />;
  if (estado === "procesando") return <Loader2 className="w-4 h-4 animate-spin text-noche-mid" />;
  if (estado === "error") return <Sparkles className="w-4 h-4 text-tierra" />;
  return <Sparkles className="w-4 h-4 text-stone-400" />;
}

async function runMockIA(docId, fileName) {
  await supabase.from("documentos").update({ procesado_estado: "procesando" }).eq("id", docId);
  await new Promise((r) => setTimeout(r, 2000));
  await supabase.from("documentos").update({
    procesado_estado: "procesado",
    procesado_at: new Date().toISOString(),
    datos_extraidos: {
      mock: true,
      nombre_original: fileName,
      planes_detectados: [
        { plan_pago: "Contado", total_final: 1500000 },
        { plan_pago: "12 cuotas", cantidad_cuotas: 12, cuota_mensual: 140000 },
      ],
    },
  }).eq("id", docId);
}

// ============================================================
// Fechas de reunión (CRUD + transiciones)
// ============================================================
function FechasReunionSection({ empresaId }) {
  const [grupos, setGrupos] = useState([]);
  const [fechas, setFechas] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("fechas_reunion")
      .select("id, fecha, ubicacion, estado, grupo_id, grupos(grado, anio_egreso, escuelas(nombre))")
      .eq("empresa_id", empresaId)
      .order("fecha");
    setFechas(data || []);
  }, [empresaId]);

  useEffect(() => {
    supabase.from("grupos").select("id, grado, anio_egreso, escuelas(nombre)").eq("estado", "activo")
      .order("anio_egreso", { ascending: false }).then(({ data }) => setGrupos(data || []));
    load();
  }, [load]);

  const transition = async (id, estado) => {
    const { error } = await supabase.from("fechas_reunion").update({ estado }).eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar propuesta de fecha?")) return;
    const { error } = await supabase.from("fechas_reunion").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <section className="bg-white rounded-xl border border-stone-200 p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg text-noche flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-pino" /> Reuniones propuestas
        </h3>
        <button onClick={() => setCreating((v) => !v)} className="flex items-center gap-1 text-sm bg-pino text-white px-3 py-1.5 rounded-lg">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </header>

      {creating && <FechaForm empresaId={empresaId} grupos={grupos} onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}

      <ul className="divide-y divide-stone-100">
        {fechas.map((f) => editingId === f.id ? (
          <li key={f.id} className="py-2">
            <FechaForm empresaId={empresaId} grupos={grupos} fecha={f} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
          </li>
        ) : (
          <li key={f.id} className="py-2 flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex-1">
              <p className="font-semibold text-noche">
                {new Date(f.fecha).toLocaleString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-stone-500">
                {f.grupos?.escuelas?.nombre} · {f.grupos?.grado} ({f.grupos?.anio_egreso})
                {f.ubicacion && <> · {f.ubicacion}</>}
              </p>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded ${
              f.estado === "confirmada" ? "bg-pino/10 text-pino" :
              f.estado === "realizada" ? "bg-noche-light text-noche" :
              f.estado === "cancelada"  ? "bg-stone-100 text-stone-400 line-through" :
              "bg-fogata/20 text-tierra"
            }`}>{f.estado}</span>
            <div className="flex items-center gap-1">
              {f.estado === "propuesta" && (
                <>
                  <button onClick={() => transition(f.id, "confirmada")} className="text-xs bg-pino text-white px-2 py-1 rounded">Confirmar</button>
                  <button onClick={() => transition(f.id, "cancelada")} className="text-xs bg-stone-200 px-2 py-1 rounded">Cancelar</button>
                </>
              )}
              {f.estado === "confirmada" && (
                <button onClick={() => transition(f.id, "realizada")} className="text-xs bg-noche text-white px-2 py-1 rounded">Marcar realizada</button>
              )}
              <button onClick={() => setEditingId(f.id)} className="text-stone-400 hover:text-noche"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(f.id)} className="text-stone-400 hover:text-tierra"><Trash2 className="w-4 h-4" /></button>
            </div>
          </li>
        ))}
        {fechas.length === 0 && <li className="py-3 text-sm text-stone-400">Sin propuestas todavía.</li>}
      </ul>
    </section>
  );
}

function FechaForm({ empresaId, grupos, fecha = null, onSaved, onCancel }) {
  const [form, setForm] = useState(() => fecha ? {
    grupo_id: String(fecha.grupo_id),
    fecha: new Date(fecha.fecha).toISOString().slice(0, 16),
    ubicacion: fecha.ubicacion || "",
  } : { grupo_id: "", fecha: "", ubicacion: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.grupo_id || !form.fecha) return;
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      grupo_id: Number(form.grupo_id),
      fecha: new Date(form.fecha).toISOString(),
      ubicacion: form.ubicacion || null,
    };
    const q = fecha
      ? supabase.from("fechas_reunion").update(payload).eq("id", fecha.id)
      : supabase.from("fechas_reunion").insert({ ...payload, estado: "propuesta" });
    const { error } = await q;
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-stone-50 p-3 rounded-lg mb-3">
      <select required value={form.grupo_id} onChange={(e) => setForm({ ...form, grupo_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
        <option value="">Grupo…</option>
        {grupos.map((g) => <option key={g.id} value={g.id}>{g.escuelas?.nombre} · {g.grado} ({g.anio_egreso})</option>)}
      </select>
      <input type="datetime-local" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <input placeholder="Ubicación / link" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
      <div className="sm:col-span-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-stone-500 px-3 py-1">Cancelar</button>
        <button disabled={saving} className="bg-pino text-white text-sm px-4 py-1 rounded-lg">
          {saving ? "…" : fecha ? "Guardar" : "Proponer"}
        </button>
      </div>
    </form>
  );
}
