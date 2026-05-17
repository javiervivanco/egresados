import React, { useCallback, useEffect, useState } from "react";
import { DollarSign, Plus, CheckCircle2, X, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const ESTADO_COLOR = {
  borrador:   "bg-stone-100 text-stone-600",
  confirmada: "bg-fogata/20 text-tierra",
  pagada:     "bg-noche-light text-noche",
  liquidada:  "bg-pino/10 text-pino",
  cancelada:  "bg-stone-100 text-stone-400 line-through",
};

const fmt = (n) => n == null ? "—" : "$ " + Number(n).toLocaleString("es-AR");

// Ventas del lado empresa: CRUD limitado a borrador/confirmada/cancelada.
// Las transiciones a pagada/liquidada las hace el super_admin (RLS).
export default function VentasSection({ empresaId, comisionDefault }) {
  const [ventas, setVentas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ventas")
      .select("*, grupos(grado, anio_egreso, escuelas(nombre)), destinos(nombre), planes_viaje(plan_pago)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setVentas(data || []);
  }, [empresaId]);

  useEffect(() => {
    supabase.from("grupos").select("id, grado, anio_egreso, escuelas(nombre)").eq("estado", "activo")
      .order("anio_egreso", { ascending: false })
      .then(({ data }) => setGrupos(data || []));
    supabase.from("destinos").select("id, nombre, planes_viaje(id, plan_pago, total_final)")
      .eq("empresa_id", empresaId).eq("activo", true)
      .then(({ data }) => setDestinos(data || []));
    load();
  }, [empresaId, load]);

  return (
    <section className="bg-white rounded-xl border border-stone-200 p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg text-noche flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-pino" /> Ventas cerradas
          <span className="text-xs text-stone-400 font-normal">comisión default {comisionDefault}%</span>
        </h3>
        <button onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 text-sm bg-pino text-white px-3 py-1.5 rounded-lg">
          <Plus className="w-4 h-4" /> Nueva venta
        </button>
      </header>

      {creating && (
        <VentaForm
          empresaId={empresaId}
          grupos={grupos}
          destinos={destinos}
          comisionDefault={comisionDefault}
          onSaved={() => { setCreating(false); load(); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {ventas.length === 0 && !creating && <p className="text-sm text-stone-400">Sin ventas. Creá la primera cuando cierres un trato.</p>}

      <ul className="divide-y divide-stone-100">
        {ventas.map((v) => (
          <VentaRow key={v.id} venta={v} grupos={grupos} destinos={destinos} onChange={load} />
        ))}
      </ul>
    </section>
  );
}

function VentaForm({ empresaId, grupos, destinos, comisionDefault, initialVenta = null, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initialVenta || {
    grupo_id: "",
    destino_id: "",
    plan_id: "",
    cantidad_pasajeros: "",
    precio_unitario: "",
    comision_pct: comisionDefault,
    observaciones: "",
  });
  const [saving, setSaving] = useState(false);

  // Planes del destino seleccionado (para sugerir precio unitario).
  const planesOptions = (destinos.find((d) => d.id === Number(form.destino_id))?.planes_viaje) || [];

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      grupo_id: Number(form.grupo_id),
      destino_id: form.destino_id ? Number(form.destino_id) : null,
      plan_id: form.plan_id ? Number(form.plan_id) : null,
      cantidad_pasajeros: Number(form.cantidad_pasajeros),
      precio_unitario: Number(form.precio_unitario),
      comision_pct: Number(form.comision_pct),
      observaciones: form.observaciones || null,
    };
    const q = initialVenta
      ? supabase.from("ventas").update(payload).eq("id", initialVenta.id)
      : supabase.from("ventas").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  };

  const total = (Number(form.cantidad_pasajeros) || 0) * (Number(form.precio_unitario) || 0);
  const comision = total * (Number(form.comision_pct) || 0) / 100;

  return (
    <form onSubmit={submit} className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select required value={form.grupo_id}
          onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Grupo…</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.escuelas?.nombre} · {g.grado} ({g.anio_egreso})
            </option>
          ))}
        </select>
        <select value={form.destino_id}
          onChange={(e) => setForm({ ...form, destino_id: e.target.value, plan_id: "" })}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Destino (opcional)…</option>
          {destinos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <select value={form.plan_id}
          onChange={(e) => {
            const p = planesOptions.find((p) => p.id === Number(e.target.value));
            setForm({ ...form, plan_id: e.target.value, precio_unitario: p?.total_final || form.precio_unitario });
          }}
          disabled={!form.destino_id}
          className="border rounded-lg px-3 py-2 text-sm disabled:bg-stone-100">
          <option value="">Plan (opcional)…</option>
          {planesOptions.map((p) => <option key={p.id} value={p.id}>{p.plan_pago} ({fmt(p.total_final)})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input required type="number" min="1" placeholder="Pasajeros" value={form.cantidad_pasajeros}
          onChange={(e) => setForm({ ...form, cantidad_pasajeros: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input required type="number" min="0" placeholder="Precio unitario" value={form.precio_unitario}
          onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input type="number" step="0.01" min="0" max="100" placeholder="Comisión %" value={form.comision_pct}
          onChange={(e) => setForm({ ...form, comision_pct: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <div className="text-right text-xs text-stone-500 self-center px-2">
          <div>Total: <strong className="text-noche">{fmt(total)}</strong></div>
          <div>Comisión: <strong className="text-tierra">{fmt(comision)}</strong></div>
        </div>
      </div>

      <textarea placeholder="Observaciones (opcional)" rows={2} value={form.observaciones}
        onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm" />

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm text-stone-500 px-3 py-1.5">Cancelar</button>
        <button disabled={saving} className="bg-pino text-white text-sm px-4 py-1.5 rounded-lg">
          {saving ? "Guardando…" : initialVenta ? "Guardar cambios" : "Crear venta"}
        </button>
      </div>
    </form>
  );
}

function VentaRow({ venta, grupos, destinos, onChange }) {
  const [editing, setEditing] = useState(false);
  const grupoLabel = `${venta.grupos?.escuelas?.nombre || ""} · ${venta.grupos?.grado || ""}`;

  const transition = async (estado) => {
    if (!confirm(`¿Marcar venta como ${estado}?`)) return;
    const { error } = await supabase.from("ventas").update({ estado }).eq("id", venta.id);
    if (error) return alert(error.message);
    onChange();
  };

  const remove = async () => {
    if (!confirm("¿Eliminar borrador?")) return;
    const { error } = await supabase.from("ventas").delete().eq("id", venta.id);
    if (error) return alert(error.message);
    onChange();
  };

  if (editing) {
    return (
      <li className="py-2">
        <VentaForm
          empresaId={venta.empresa_id}
          grupos={grupos}
          destinos={destinos}
          comisionDefault={venta.comision_pct}
          initialVenta={venta}
          onSaved={() => { setEditing(false); onChange(); }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="py-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <p className="font-semibold text-noche text-sm">{grupoLabel}</p>
        <p className="text-xs text-stone-500">
          {venta.destinos?.nombre || "—"}
          {venta.planes_viaje?.plan_pago && <> · {venta.planes_viaje.plan_pago}</>}
          {" · "}{venta.cantidad_pasajeros} pasajeros × {fmt(venta.precio_unitario)}
        </p>
      </div>
      <div className="text-right text-sm">
        <p className="font-semibold text-noche">{fmt(venta.monto_total)}</p>
        <p className="text-[11px] text-stone-500">Comisión {venta.comision_pct}% = <strong className="text-tierra">{fmt(venta.comision_monto)}</strong></p>
      </div>
      <span className={`text-[11px] px-2 py-0.5 rounded ${ESTADO_COLOR[venta.estado]}`}>{venta.estado}</span>
      <div className="flex items-center gap-1">
        {venta.estado === "borrador" && (
          <>
            <button onClick={() => setEditing(true)} className="text-stone-400 hover:text-noche" title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => transition("confirmada")} className="flex items-center gap-1 text-xs bg-pino text-white px-2 py-1 rounded">
              Confirmar <ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={remove} className="text-stone-400 hover:text-tierra" title="Eliminar">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        {venta.estado === "confirmada" && (
          <>
            <button onClick={() => transition("cancelada")} className="flex items-center gap-1 text-xs bg-stone-200 text-stone-700 px-2 py-1 rounded">
              <X className="w-3 h-3" /> Cancelar
            </button>
          </>
        )}
        {venta.estado === "pagada" && <span className="text-xs text-noche-mid flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> pago recibido</span>}
        {venta.estado === "liquidada" && <span className="text-xs text-pino flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> cerrada</span>}
      </div>
    </li>
  );
}
