import React, { useEffect, useState, useCallback } from "react";
import { CalendarClock, Check, X, Building2 } from "lucide-react";
import { supabase } from "../supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Votación etapa 1: las empresas proponen fechas de reunión por grupo y las
// familias votan sí/no. Se autocolapsa si no hay propuestas activas.
export default function MeetingDateVoting({ familiaId, grupoId }) {
  const [fechas, setFechas] = useState([]);
  const [misVotos, setMisVotos] = useState({});
  const [tally, setTally] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !grupoId) { setLoading(false); return; }
    setLoading(true);

    const { data: fs } = await supabase
      .from("fechas_reunion")
      .select("id, fecha, ubicacion, estado, empresa_id, empresas(nombre)")
      .eq("grupo_id", grupoId)
      .in("estado", ["propuesta", "confirmada"])
      .order("fecha");

    const lista = fs || [];
    setFechas(lista);
    if (lista.length === 0) { setLoading(false); return; }

    const ids = lista.map((f) => f.id);
    if (familiaId) {
      const { data: mv } = await supabase
        .from("votos_fecha").select("fecha_id, voto")
        .eq("familia_id", familiaId).in("fecha_id", ids);
      setMisVotos(Object.fromEntries((mv || []).map((v) => [v.fecha_id, v.voto])));
    }

    const { data: all } = await supabase
      .from("votos_fecha").select("fecha_id, voto").in("fecha_id", ids);
    const t = {};
    for (const v of (all || [])) {
      (t[v.fecha_id] ??= { si: 0, no: 0 })[v.voto ? "si" : "no"]++;
    }
    setTally(t);
    setLoading(false);
  }, [familiaId, grupoId]);

  useEffect(() => { load(); }, [load]);

  const vote = async (fechaId, value) => {
    if (!supabase || !familiaId || !value) return;
    const voto = value === "si";
    const { error } = await supabase
      .from("votos_fecha")
      .upsert({ familia_id: familiaId, fecha_id: fechaId, voto }, { onConflict: "familia_id,fecha_id" });
    if (error) { alert(error.message); return; }
    load();
  };

  if (loading || fechas.length === 0) return null;

  return (
    <Card className="bg-accent/10 border-accent/40 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-destructive" />
          <div>
            <CardTitle className="font-sans italic text-lg">Reuniones propuestas</CardTitle>
            <CardDescription>Elegí qué fechas te quedan bien. Las empresas ven los votos para confirmar.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {fechas.map((f) => {
            const t = tally[f.id] || { si: 0, no: 0 };
            const mi = misVotos[f.id];
            const value = mi === true ? "si" : mi === false ? "no" : "";
            return (
              <li key={f.id} className="bg-card rounded-xl border px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">
                    {new Date(f.fecha).toLocaleString("es-AR", {
                      weekday: "short", day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3" /> {f.empresas?.nombre || "Empresa"}
                    {f.ubicacion && <span className="opacity-70">· {f.ubicacion}</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {t.si} sí · {t.no} no
                  </p>
                </div>
                <ToggleGroup
                  type="single"
                  value={value}
                  onValueChange={(v) => vote(f.id, v)}
                  className="shrink-0"
                >
                  <ToggleGroupItem
                    value="si"
                    aria-label="Sí"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <Check className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="no"
                    aria-label="No"
                    className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
                  >
                    <X className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
