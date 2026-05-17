import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const ESTADOS = ["borrador", "confirmada", "pagada", "liquidada", "cancelada"];
const ESTADO_COLOR = {
  borrador:   "bg-stone-100 text-stone-600",
  confirmada: "bg-fogata/20 text-tierra",
  pagada:     "bg-noche-light text-noche",
  liquidada:  "bg-pino/10 text-pino",
  cancelada:  "bg-stone-100 text-stone-400 line-through",
};

const fmt = (n) => "$ " + Number(n || 0).toLocaleString("es-AR");

// Dashboard de ventas para super_admin. Muestra agregados + lista detallada
// con acciones para transiciones que solo super_admin puede hacer (pagada,
// liquidada).
export default function SuperVentas() {
  const [ventas, setVentas] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");

  const load = useCallback(async () => {
    let q = supabase
      .from("ventas")
      .select("*, empresas(nombre), grupos(grado, anio_egreso, escuelas(nombre))")
      .order("created_at", { ascending: false });
    if (filtroEstado) q = q.eq("estado", filtroEstado);
    const { data } = await q;
    setVentas(data || []);
  }, [filtroEstado]);

  useEffect(() => { load(); }, [load]);

  // Agregados por empresa (solo confirmadas+pagadas+liquidadas cuentan para
  // comisiones realmente generadas — borrador y cancelada no).
  const stats = useMemo(() => {
    const cuentanComision = (v) => ["confirmada", "pagada", "liquidada"].includes(v.estado);
    const total = ventas.filter(cuentanComision).reduce((s, v) => s + (v.monto_total || 0), 0);
    const comisionTotal = ventas.filter(cuentanComision).reduce((s, v) => s + (v.comision_monto || 0), 0);
    const cobrada = ventas.filter((v) => v.estado === "pagada" || v.estado === "liquidada")
      .reduce((s, v) => s + (v.comision_monto || 0), 0);
    const pendiente = comisionTotal - cobrada;

    const porEmpresa = new Map();
    for (const v of ventas) {
      if (!cuentanComision(v)) continue;
      const k = v.empresas?.nombre || `Empresa ${v.empresa_id}`;
      const e = porEmpresa.get(k) || { nombre: k, monto: 0, comision: 0, ventas: 0 };
      e.monto += v.monto_total || 0;
      e.comision += v.comision_monto || 0;
      e.ventas += 1;
      porEmpresa.set(k, e);
    }
    return { total, comisionTotal, cobrada, pendiente, porEmpresa: [...porEmpresa.values()].sort((a, b) => b.comision - a.comision) };
  }, [ventas]);

  const transition = async (id, estado) => {
    if (!confirm(`¿Pasar la venta a ${estado}?`)) return;
    const { error } = await supabase.from("ventas").update({ estado }).eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Ventas confirmadas" value={fmt(stats.total)} icon={DollarSign} />
        <Stat label="Comisión generada"  value={fmt(stats.comisionTotal)} icon={TrendingUp} accent="tierra" />
        <Stat label="Comisión cobrada"   value={fmt(stats.cobrada)} icon={CheckCircle2} accent="pino" />
        <Stat label="Pendiente de cobro" value={fmt(stats.pendiente)} accent="noche" />
      </div>

      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="font-serif text-lg text-noche mb-3">Comisión por empresa</h3>
        {stats.porEmpresa.length === 0 ? (
          <p className="text-sm text-stone-400">Sin ventas confirmadas.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {stats.porEmpresa.map((e) => (
              <li key={e.nombre} className="py-2 flex items-center gap-3 text-sm">
                <span className="font-semibold text-noche flex-1">{e.nombre}</span>
                <span className="text-xs text-stone-500">{e.ventas} {e.ventas === 1 ? "venta" : "ventas"}</span>
                <span className="text-stone-700">{fmt(e.monto)}</span>
                <span className="text-tierra font-semibold">{fmt(e.comision)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <header className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-noche">Detalle</h3>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs">
            <option value="">Todos los estados</option>
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </header>
        {ventas.length === 0 ? (
          <p className="text-sm text-stone-400">Sin resultados.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {ventas.map((v) => (
              <li key={v.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-noche">{v.empresas?.nombre} → {v.grupos?.escuelas?.nombre} · {v.grupos?.grado}</p>
                  <p className="text-xs text-stone-500">{v.cantidad_pasajeros} × {fmt(v.precio_unitario)} · {v.comision_pct}%</p>
                </div>
                <span className="text-stone-700">{fmt(v.monto_total)}</span>
                <span className="text-tierra font-semibold">{fmt(v.comision_monto)}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded ${ESTADO_COLOR[v.estado]}`}>{v.estado}</span>
                {v.estado === "confirmada" && (
                  <button onClick={() => transition(v.id, "pagada")}
                    className="text-xs bg-noche text-white px-2 py-1 rounded">Marcar pagada</button>
                )}
                {v.estado === "pagada" && (
                  <button onClick={() => transition(v.id, "liquidada")}
                    className="text-xs bg-pino text-white px-2 py-1 rounded">Liquidar</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function Stat({ label, value, icon: Icon, accent = "stone" }) {
  const color = {
    tierra: "text-tierra",
    pino:   "text-pino",
    noche:  "text-noche",
    stone:  "text-stone-700",
  }[accent];
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-stone-500">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
