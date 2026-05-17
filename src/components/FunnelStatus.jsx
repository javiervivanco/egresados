import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Compass, CalendarClock, Users, Vote, CheckCircle2, ArrowRight,
  MessageSquare, Trophy, Sparkles,
} from "lucide-react";
import { supabase } from "../supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// FunnelStatus — dashboard de etapa del 2do funnel (elección).
//
// Calcula la etapa actual del grupo a partir del estado en DB y muestra:
//   * progress bar de las 5 etapas
//   * hero con etapa actual + CTA primario (qué hacer ahora)
//   * stats de prueba social
//
// El cálculo de etapa es secuencial — la primera condición que matchea gana:
//   5. CONFIRMADO   → hay venta confirmada/pagada/liquidada
//   4. ESPERANDO    → la familia ya votó sus 3 prioridades (votos_plan)
//   3. DECIDIR      → hay reunión "realizada" o confirmada con fecha pasada
//   2. REUNION      → reunión confirmada con fecha futura (esperar el día)
//   1. COORDINAR    → hay fechas en estado "propuesta" sin voto de la familia
//   0. DESCUBRIR    → default (todavía no hay fechas propuestas)
//
// Props:
//   familiaId, grupoId — para queries scopeadas
//   onAccion(target) — callback opcional: target ∈ { "fechas", "comparar", "votar", "mensajes" }
//
const ETAPAS = [
  { id: "descubrir",  label: "Descubrir",  num: 1, icon: Compass },
  { id: "coordinar",  label: "Coordinar",  num: 2, icon: CalendarClock },
  { id: "reunion",    label: "Reunión",    num: 3, icon: Users },
  { id: "decidir",    label: "Decidir",    num: 4, icon: Vote },
  { id: "confirmado", label: "¡Listo!",    num: 5, icon: Trophy },
];

export default function FunnelStatus({ familiaId, grupoId, onAccion, onEtapa }) {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!supabase || !grupoId) return;
    const [v, fr, vp, vf, m, dest] = await Promise.all([
      supabase.from("ventas").select("estado, empresas(nombre)").eq("grupo_id", grupoId).in("estado", ["confirmada", "pagada", "liquidada"]).maybeSingle(),
      supabase.from("fechas_reunion").select("id, fecha, estado, empresas(nombre)").eq("grupo_id", grupoId).in("estado", ["propuesta", "confirmada", "realizada"]).order("fecha"),
      supabase.from("votos_plan").select("prioridad").eq("familia_id", familiaId || 0),
      familiaId ? supabase.from("votos_fecha").select("fecha_id").eq("familia_id", familiaId) : { data: [] },
      supabase.from("mensajes").select("id, leido_grupo, autor_rol").eq("grupo_id", grupoId),
      supabase.from("destinos").select("id", { count: "exact", head: true }).eq("activo", true),
    ]);
    setData({
      venta: v?.data || null,
      fechas: fr?.data || [],
      misVotosPlan: vp?.data || [],
      misVotosFecha: vf?.data || [],
      mensajes: m?.data || [],
      totalDestinos: dest?.count || 0,
    });
  }, [familiaId, grupoId]);

  useEffect(() => { load(); }, [load]);

  const etapa = useMemo(() => calcularEtapa(data), [data]);
  useEffect(() => { if (etapa?.id) onEtapa?.(etapa.id); }, [etapa?.id, onEtapa]);
  if (!data || !etapa) return null;

  const etapaIdx = ETAPAS.findIndex((e) => e.id === etapa.id);
  const progressPct = ((etapaIdx + 1) / ETAPAS.length) * 100;

  return (
    <section className="mb-6">
      <Card className="border-primary/30 shadow-md overflow-hidden">
        {/* Progress bar de etapas */}
        <div className="bg-primary/5 px-4 sm:px-6 pt-4 pb-3 border-b border-primary/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-primary font-bold">
              Etapa {etapaIdx + 1} de {ETAPAS.length}
            </p>
            <Badge variant="outline" className="bg-card text-primary border-primary/30">
              {etapa.label}
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2 mb-2" />
          <div className="hidden sm:flex items-center justify-between text-[10.5px] text-muted-foreground">
            {ETAPAS.map((e, i) => {
              const Icon = e.icon;
              const reached = i <= etapaIdx;
              return (
                <span key={e.id} className={`flex items-center gap-1 ${reached ? "text-primary font-semibold" : "opacity-60"}`}>
                  <Icon className="w-3 h-3" />
                  {e.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Hero: título + CTA + prueba social */}
        <CardContent className="px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="font-sans italic text-2xl sm:text-3xl text-foreground leading-tight mb-1">
                {etapa.titulo}
              </h2>
              {etapa.subtitulo && (
                <p className="text-muted-foreground text-sm leading-relaxed">{etapa.subtitulo}</p>
              )}
              {etapa.social && (
                <p className="text-[12px] text-primary font-semibold mt-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {etapa.social}
                </p>
              )}
            </div>
            {etapa.cta && (
              <Button
                size="lg"
                onClick={() => onAccion?.(etapa.target)}
                className="font-bold whitespace-nowrap shrink-0"
                variant={etapa.id === "confirmado" ? "secondary" : "default"}
              >
                {etapa.cta} <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ============================================================
// Cálculo de etapa
// ============================================================
function calcularEtapa(d) {
  if (!d) return null;
  const { venta, fechas, misVotosPlan, misVotosFecha, mensajes, totalDestinos } = d;
  const ahora = new Date();

  // 5. CONFIRMADO
  if (venta) {
    return {
      id: "confirmado",
      label: "¡Listo!",
      titulo: `Su grupo cerró con ${venta.empresas?.nombre || "una empresa"}`,
      subtitulo: "¡Felicitaciones! El viaje está confirmado. Ya pueden empezar a planificar lo divertido.",
      cta: "Ver detalles",
      target: "venta",
    };
  }

  // 4. ESPERANDO RESULTADO — la familia ya votó sus 3 prioridades
  if (misVotosPlan.length >= 3) {
    return {
      id: "decidir",
      label: "Decidir",
      titulo: "Ya votaste tus 3 prioridades",
      subtitulo: "Esperá a que el resto de las familias termine de votar. Te avisamos por mail cuando haya resultado.",
      cta: "Ver resultados parciales",
      target: "votar",
      social: "Tu voto está contado",
    };
  }

  const propuestas = fechas.filter((f) => f.estado === "propuesta");
  const confirmadas = fechas.filter((f) => f.estado === "confirmada");
  const realizadas = fechas.filter((f) => f.estado === "realizada");
  const confirmadaFutura = confirmadas.find((f) => new Date(f.fecha) > ahora);
  const confirmadaPasada = confirmadas.find((f) => new Date(f.fecha) <= ahora);

  // 4. DECIDIR — ya hubo reunión, falta votar planes
  if (realizadas.length > 0 || confirmadaPasada) {
    return {
      id: "decidir",
      label: "Decidir",
      titulo: "Es momento de votar el viaje",
      subtitulo: "Ya conocieron a las empresas. Ahora elegí tus 3 opciones favoritas en orden de preferencia.",
      cta: `Votar (${misVotosPlan.length}/3)`,
      target: "votar",
      social: misVotosPlan.length > 0 ? `Ya votaste ${misVotosPlan.length} prioridad${misVotosPlan.length > 1 ? "es" : ""}` : null,
    };
  }

  // 3. REUNION — hay reunión confirmada con fecha futura
  if (confirmadaFutura) {
    const f = new Date(confirmadaFutura.fecha);
    return {
      id: "reunion",
      label: "Reunión",
      titulo: `Reunión confirmada el ${f.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}`,
      subtitulo: `${confirmadaFutura.empresas?.nombre || "La empresa"} les va a presentar la propuesta. Mientras tanto, mirá las opciones para llegar con preguntas.`,
      cta: "Ver propuestas",
      target: "comparar",
      social: `${confirmadas.length} reunión${confirmadas.length > 1 ? "es" : ""} confirmada${confirmadas.length > 1 ? "s" : ""}`,
    };
  }

  // 2. COORDINAR — hay fechas propuestas sin votar
  if (propuestas.length > 0) {
    const yaVotadas = misVotosFecha.length;
    const faltan = propuestas.length - propuestas.filter((p) => misVotosFecha.find((v) => v.fecha_id === p.id)).length;
    return {
      id: "coordinar",
      label: "Coordinar reunión",
      titulo: faltan > 0
        ? `Hay ${faltan} fecha${faltan > 1 ? "s" : ""} esperando tu voto`
        : "¡Ya votaste todas las fechas!",
      subtitulo: faltan > 0
        ? "Las empresas proponen fechas para presentarles su propuesta. Decí cuál te queda mejor."
        : "Esperá a que el resto del grupo termine de votar y la empresa confirme la fecha.",
      cta: faltan > 0 ? "Votar fechas →" : null,
      target: "fechas",
      social: yaVotadas > 0 ? `Votaste ${yaVotadas} fecha${yaVotadas > 1 ? "s" : ""}` : null,
    };
  }

  // 1. DESCUBRIR — todavía no hay propuestas
  return {
    id: "descubrir",
    label: "Descubrir",
    titulo: "Conocé las propuestas",
    subtitulo: `Mirá los ${totalDestinos || ""} destinos disponibles. Cuando una empresa proponga una reunión, te avisamos acá.`,
    cta: "Comparar destinos",
    target: "comparar",
    social: mensajes.length > 0 ? `${mensajes.length} mensaje${mensajes.length > 1 ? "s" : ""} con empresas` : null,
  };
}
