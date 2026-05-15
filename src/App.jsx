import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Bus, Plane, MapPin, Bed, Lightbulb, Users, Shield, Tag, Sparkles, Calculator, BookOpen, Wallet, CalendarClock, Info, CheckCircle2, Building2, Search, LayoutGrid, Wand2, MessageCircleWarning, Vote, BarChart3, Send, CreditCard, DollarSign, Star } from "lucide-react";
import { supabase } from "./supabase";

// Carga todos los JSON por empresa en src/data/. Cada archivo debe ser un array de filas.
// Para agregar una empresa nueva: tirar un <slug>.json al directorio y reiniciar dev.
const dataModules = import.meta.glob("./data/*.json", { eager: true, import: "default" });

// Normalización de destinos: variantes que son el mismo lugar se unifican bajo un nombre canónico.
const DESTINO_ALIAS = {
  "Villa Carlos Paz / Córdoba": "Carlos Paz / Córdoba",
  "Carlos Paz":                 "Carlos Paz / Córdoba",
  "Córdoba":                    "Carlos Paz / Córdoba",
  "Carlos Paz / Córdoba (en Bus)": "Carlos Paz / Córdoba",
};
const normalizeDestino = (d) => DESTINO_ALIAS[d] || d;

const RAW = Object.entries(dataModules)
  .filter(([path]) => !path.endsWith("/viajes.json"))
  .flatMap(([, mod]) => (Array.isArray(mod) ? mod : []))
  .filter(r => r && r.Empresa)
  .map(r => ({ ...r, Destino: normalizeDestino(r.Destino) }));

// === HELPERS ===
const fmt = (n) => {
  if (n == null || n === "" || isNaN(n)) return "—";
  return "$ " + Number(n).toLocaleString("es-AR");
};

const COMPANY_ACCENT = {
  "Flecha":          { bg: "bg-fogata-light", border: "border-fogata",     text: "text-fogata",     dot: "bg-fogata",     ring: "ring-fogata/40",     chip: "bg-fogata/30" },
  "Super Tour":      { bg: "bg-tierra-light", border: "border-tierra",     text: "text-tierra",     dot: "bg-tierra",     ring: "ring-tierra/40",     chip: "bg-tierra/30" },
  "Recrear":         { bg: "bg-pino-light",   border: "border-pino-mid",   text: "text-pino",       dot: "bg-pino",       ring: "ring-pino/40",       chip: "bg-pino-mid/30" },
  "Lake Travel":     { bg: "bg-noche-light",  border: "border-noche-mid",  text: "text-noche",      dot: "bg-noche",      ring: "ring-noche/40",      chip: "bg-noche-mid/30" },
  "Serrano":         { bg: "bg-hojas-light",  border: "border-hojas",      text: "text-pino",       dot: "bg-hojas-mid",  ring: "ring-hojas/50",      chip: "bg-hojas/40" },
  "Puerto Aventura": { bg: "bg-noche-light",  border: "border-noche/60",   text: "text-noche-mid",  dot: "bg-noche-mid",  ring: "ring-noche-mid/40", chip: "bg-noche-mid/20" },
};

// Mapa explícito destino → provincia. Usa los nombres ya normalizados por DESTINO_ALIAS.
const PROVINCIA_BY_DESTINO = {
  "Cariló": "Buenos Aires",
  "Chascomús": "Buenos Aires",
  "Dolores (Parque Termal)": "Buenos Aires",
  "Mar del Plata": "Buenos Aires",
  "San Clemente": "Buenos Aires",
  "San Pedro": "Buenos Aires",
  "Tandil": "Buenos Aires",
  "Carlos Paz / Córdoba": "Córdoba",
  "Federación": "Entre Ríos",
};

const guessProvincia = (destino) => {
  if (PROVINCIA_BY_DESTINO[destino]) return PROVINCIA_BY_DESTINO[destino];
  if (/córdoba/i.test(destino)) return "Córdoba";
  return "Otros";
};

// Orden de provincias en el listado. Córdoba primero por ser el destino más popular.
const PROVINCIA_ORDER = ["Córdoba", "Buenos Aires", "Entre Ríos"];

// Destinos destacados: aparecen primero dentro de su provincia.
const DESTINO_FEATURED = new Set(["Carlos Paz / Córdoba"]);

function getPaymentTip(plan) {
  const c = plan.Cantidad_Cuotas;
  if (c === 1) return "Pagás todo el viaje de una sola vez. Suele tener el precio más bajo y a veces ofrece descuentos.";
  if (c === null) return "Es un plan flexible. La empresa coordina los pagos directamente con el grupo.";
  if (c <= 5) return `Pagás en ${c} cuotas. Es un plan corto: cada pago es más alto, pero el precio total es menor que en planes largos.`;
  if (c <= 12) return `Pagás en ${c} cuotas mensuales. Es un plan intermedio: equilibra el monto mensual con el total final.`;
  return `Pagás en ${c} cuotas mensuales. Es un plan extendido: la cuota mensual es baja, pero el total final es más alto.`;
}

// === HELP TIP ===
function HelpTip({ children }) {
  return (
    <div className="flex gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3.5 py-2.5">
      <Lightbulb className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" strokeWidth={2.2} />
      <p className="text-[12.5px] text-sky-900 leading-snug">{children}</p>
    </div>
  );
}

// === GLOSARIO TÉCNICO (textos para tooltips) ===
const GLOSARIO = {
  cuotaMensual: "Monto fijo que pagás cada mes durante todo el plan. Importante: confirmá con la empresa si el valor queda fijo o se ajusta por inflación.",
  ultimaCuota: "Mes estimado en el que pagarías la última cuota si arrancás los pagos este mes. La fecha real puede variar según cuándo firmes el contrato.",
  alFirmar: "Plata que se paga al momento de firmar el contrato. Reserva tu lugar e incluye la inscripción más cualquier reserva o primera cuota especial.",
  inscripcion: "Primer pago al firmar el contrato. Forma parte del precio total del viaje.",
  reserva: "Adelanto pequeño al apuntarse. En algunas empresas se suma a la inscripción.",
  primeraCuota: "Pago al firmar, distinto del valor de las cuotas mensuales habituales.",
  anticipo: "Pago grande adicional, fuera de las cuotas, que se hace antes del viaje.",
  totalFinal: "Suma de todos los pagos del plan elegido (inscripción, reserva, cuotas y anticipo). No incluye gastos personales en el viaje.",
  contado: "Precio si pagás todo el viaje en uno o pocos pagos al inicio. Suele ser bastante más barato que el plan en cuotas.",
  cheapest: "Es el plan más barato disponible para esta misma duración del viaje, dentro de esta empresa y destino.",
  liberados: "Pasajeros que viajan sin pagar. Suelen ser acompañantes adultos o premios cuando el grupo llega a cierto número de chicos.",
  seguro: "Garantiza el reintegro del dinero pagado si la empresa no cumple con el viaje. Confirmá con la empresa el alcance exacto (cancelación, quiebra, etc.).",
  descuentos: "Beneficios sobre el precio. Suelen aplicar a hermanos que ya viajaron, contratación temprana o casos especiales.",
  vigencia: "Hasta cuándo está garantizado el precio publicado. Pasada la fecha la empresa puede actualizar tarifas.",
};

// === TOOLTIP (mobile-friendly: tap para abrir, cierra al tap-out) ===
function Tooltip({ text, label, align = "left", className = "" }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const t = setTimeout(() => document.addEventListener("click", close, { once: true }), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", close); };
  }, [open]);
  const boxAlign = align === "right" ? "right-0" : "left-0";
  return (
    <span className={`relative inline-flex items-center align-baseline ${className}`}>
      {label}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label={`Ayuda sobre ${typeof label === "string" ? label : "este término"}`}
        aria-expanded={open}
        className="ml-0.5 inline-flex items-center justify-center p-1.5 -m-1.5 opacity-60 hover:opacity-100 focus:opacity-100 active:opacity-100 transition-opacity touch-manipulation"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.2} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-30 ${boxAlign} top-full mt-1.5 w-64 max-w-[78vw] bg-stone-900 text-white text-[12px] font-normal normal-case tracking-normal leading-snug rounded-lg p-3 shadow-xl ring-1 ring-white/10`}
        >
          {text}
        </span>
      )}
    </span>
  );
}

// === FECHA ÚLTIMA CUOTA ===
const _mesFmt = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });
const calcUltimaCuotaLabel = (cuotasRestantes) => {
  if (!cuotasRestantes || cuotasRestantes < 1) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + cuotasRestantes);
  return _mesFmt.format(d).replace(/\.$/, "").replace(".", "");
};

// === GUIDE BANNER ===
function GuideBanner() {
  const [open, setOpen] = useState(false);
  const items = [
    { title: "Pago de Contado", desc: "Pagás el viaje completo en uno o muy pocos pagos al principio. Es la opción más barata: muchas empresas ofrecen un descuento por elegirla." },
    { title: "Cuotas mensuales", desc: "Es un plan donde dividís el total en pagos mensuales iguales. A más cuotas, menor es el monto que pagás cada mes, pero el precio total final aumenta." },
    { title: "Inscripción", desc: "Es el primer pago que hacés al firmar el contrato. Sirve para reservar tu lugar en el viaje y forma parte del precio total." },
    { title: "Reserva", desc: "Un adelanto pequeño que se entrega al apuntarse. En algunas empresas se suma a la inscripción." },
    { title: "Anticipo o Saldo", desc: "Es un pago grande que se hace antes del viaje, además de las cuotas. Cubre los gastos previos al inicio del viaje." },
    { title: "Liberados", desc: "Pasajeros que viajan sin pagar. Suelen ser acompañantes adultos o premios cuando el grupo llega a cierto número de participantes." },
    { title: "Seguro de Caución", desc: "Es una garantía: si la empresa no cumple con el viaje, te devuelven el dinero pagado." },
  ];

  return (
    <div className="bg-white border border-sky-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-sky-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-sky-700" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-700 font-bold">Guía rápida</p>
            <h3 className="font-serif text-xl text-noche leading-tight">¿Cómo leer esta comparativa?</h3>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-sky-700 font-semibold">
          {open ? "Ocultar" : "Ver guía"}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 gap-3 animate-[fadeIn_0.25s_ease-out]">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 p-3 bg-sky-50/70 border border-sky-100 rounded-xl">
              <Lightbulb className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="font-semibold text-sky-950 text-sm mb-0.5">{item.title}</p>
                <p className="text-[13px] text-sky-900/80 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === DESTINATION CARD ===
function DestinationCard({ empresa, destino, planes, defaultNombre = "", onVoted }) {
  const accent = COMPANY_ACCENT[empresa] || COMPANY_ACCENT["Flecha"];
  const TransIcon = planes[0].Transporte === "Avión" ? Plane : Bus;

  const durations = useMemo(() => {
    const set = new Set();
    planes.forEach(p => { if (p.Dias && p.Noches) set.add(`${p.Dias}|${p.Noches}`); });
    return Array.from(set).map(d => {
      const [dias, noches] = d.split("|");
      return { dias: Number(dias), noches: Number(noches), key: d };
    }).sort((a, b) => a.dias - b.dias);
  }, [planes]);

  const hasDurations = durations.length > 0;
  const [selectedDuration, setSelectedDuration] = useState(hasDurations ? durations[0].key : null);
  const [showActivities, setShowActivities] = useState(false);
  const [showConditions, setShowConditions] = useState(false);

  const availablePlans = useMemo(() => {
    if (!hasDurations) return planes;
    const [dias, noches] = selectedDuration.split("|").map(Number);
    return planes.filter(p => p.Dias === dias && p.Noches === noches);
  }, [planes, selectedDuration, hasDurations]);

  // Default = plan con la cuota mensual más baja (válida > 0). Fallback: menor Total_Final.
  const defaultPlanIdx = useMemo(() => {
    let bestCuotaIdx = -1, bestCuota = Infinity;
    let bestTotalIdx = 0, bestTotal = Infinity;
    availablePlans.forEach((p, i) => {
      if (p.Cuota_Mensual != null && p.Cuota_Mensual > 0 && p.Cuota_Mensual < bestCuota) {
        bestCuota = p.Cuota_Mensual;
        bestCuotaIdx = i;
      }
      if (p.Total_Final != null && p.Total_Final > 0 && p.Total_Final < bestTotal) {
        bestTotal = p.Total_Final;
        bestTotalIdx = i;
      }
    });
    return bestCuotaIdx !== -1 ? bestCuotaIdx : bestTotalIdx;
  }, [availablePlans]);

  const [selectedPlanIdx, setSelectedPlanIdx] = useState(defaultPlanIdx);
  useEffect(() => { setSelectedPlanIdx(defaultPlanIdx); }, [defaultPlanIdx]);

  const plan = availablePlans[selectedPlanIdx] || availablePlans[0];
  if (!plan) return null;

  const totals = availablePlans.map(p => p.Total_Final).filter(v => v != null && !isNaN(v));
  const minTotal = totals.length ? Math.min(...totals) : null;
  const isCheapest = plan.Total_Final === minTotal && totals.length > 1;

  const acts = (plan.Actividades || "").split(",").map(s => s.trim()).filter(Boolean);

  // Cálculos para la Calculadora de Pagos
  const reserva = plan.Reserva || 0;
  const inscripcion = plan.Inscripcion || 0;
  const primeraCuota = plan.Primera_Cuota || 0;
  // Cuando Primera_Cuota tiene un valor distinto de Cuota_Mensual significa que es un pago especial al firmar
  const hasPrimeraCuotaDistinta = primeraCuota > 0 && plan.Cuota_Mensual && primeraCuota !== plan.Cuota_Mensual;
  const upfront = inscripcion + reserva + (hasPrimeraCuotaDistinta ? primeraCuota : 0);
  // Lógica de cuotas mensuales restantes según la estructura del plan:
  // - Si hay Inscripción + Primera Cuota distinta (caso Flecha): la inscripción y la primera cuota
  //   ya cuentan dentro de las "N cuotas" del plan, entonces quedan N-2 cuotas mensuales.
  // - Si solo hay Primera Cuota distinta (sin Inscripción): la primera cuota cuenta dentro de N → N-1 mensuales.
  // - Si solo hay Inscripción (caso Super Tour, Recrear, Lake): las cuotas son N completas.
  let cuotasRestantes = plan.Cantidad_Cuotas || 0;
  if (hasPrimeraCuotaDistinta) {
    cuotasRestantes -= 1;
    if (inscripcion > 0) cuotasRestantes -= 1;
  }
  cuotasRestantes = Math.max(0, cuotasRestantes);
  const hasMonthlyPayments = cuotasRestantes > 0 && plan.Cuota_Mensual && plan.Cantidad_Cuotas > 1;
  const hasAnticipo = plan.Anticipo_Saldo && plan.Anticipo_Saldo > 0;

  // Plan contado de referencia (si existe entre las opciones disponibles y no es el actual)
  const planContado = availablePlans.find(p => p.Cantidad_Cuotas === 1 && p.Total_Final);
  const showContadoRef = planContado && planContado !== plan;

  // Mes estimado de la última cuota (asumiendo arranque este mes)
  const ultimaCuotaLabel = hasMonthlyPayments ? calcUltimaCuotaLabel(cuotasRestantes) : null;

  let stepCounter = 0;
  const nextStep = () => ++stepCounter;

  return (
    <div className="bg-white border-2 sm:border border-stone-300 sm:border-stone-200 rounded-2xl overflow-hidden shadow-md sm:shadow-sm hover:shadow-xl hover:border-stone-300 transition-all duration-300 flex flex-col">

      {/* HERO — destino + precio grande arriba (metáfora Instagram: imagen primero) */}
      <div className="bg-hojas-light text-noche px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-5 relative overflow-hidden border-b border-hojas/40">
        {isCheapest && (
          <span className="absolute top-3 right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase rounded-full bg-fogata text-noche flex items-center gap-1 z-10 shadow-sm">
            <CheckCircle2 className="w-3 h-3" strokeWidth={2.4} />
            <Tooltip text={GLOSARIO.cheapest} label="Más económico" align="right" className="leading-none" />
          </span>
        )}

        {/* fila empresa + transporte */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 pr-24">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full ${accent.dot} shrink-0`} />
            <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] font-bold text-pino truncate">{empresa}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 bg-white/70 backdrop-blur rounded-md border border-pino/15 shrink-0">
            <TransIcon className="w-3.5 h-3.5 text-pino" strokeWidth={2} />
            <span className="text-[11.5px] sm:text-[12.5px] font-semibold text-pino">{plan.Transporte}</span>
          </div>
        </div>

        {/* destino headline */}
        <h3 className="font-serif text-2xl sm:text-3xl text-noche leading-tight tracking-tight flex items-start gap-1.5 sm:gap-2 mb-4 sm:mb-5">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-fogata mt-0.5 sm:mt-1 shrink-0" strokeWidth={1.8} />
          <span className="break-words">{destino}</span>
        </h3>

        {/* PRECIO HERO */}
        {hasMonthlyPayments && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Calculator className="w-3 h-3 text-pino" strokeWidth={2.2} />
              <p className="text-[10px] uppercase tracking-[0.18em] text-pino font-bold">
                <Tooltip text={GLOSARIO.cuotaMensual} label="Pagás por mes" />
              </p>
            </div>
            <p className="font-serif text-4xl sm:text-5xl font-bold leading-none tracking-tight text-noche">{fmt(plan.Cuota_Mensual)}</p>
            <p className="text-[12px] sm:text-[13px] text-noche/75 mt-1.5 sm:mt-2 leading-snug">
              Durante <span className="font-bold text-noche">{cuotasRestantes} {cuotasRestantes === 1 ? "mes" : "meses"}</span>
              {hasPrimeraCuotaDistinta ? " después de la primera" : ""}
              {ultimaCuotaLabel && (
                <span className="text-noche/55">
                  {" · "}
                  <Tooltip text={GLOSARIO.ultimaCuota} label={<>última: <span className="font-bold text-noche">{ultimaCuotaLabel}</span></>} />
                </span>
              )}
            </p>
          </div>
        )}

        {!hasMonthlyPayments && plan.Cantidad_Cuotas === 1 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-pino font-bold mb-1">
              <Tooltip text={GLOSARIO.contado} label="Pago único" />
            </p>
            <p className="font-serif text-3xl sm:text-4xl font-bold leading-none tracking-tight text-noche">{fmt(plan.Total_Final || upfront)}</p>
            <p className="text-[12px] sm:text-[13px] text-noche/75 mt-1.5">Todo en un solo pago al firmar</p>
          </div>
        )}

        {plan.Cantidad_Cuotas == null && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-pino font-bold mb-1">Plan a coordinar</p>
            <p className="text-[13px] sm:text-[14px] text-noche/85 leading-snug">Las condiciones de pago se acuerdan directamente con la empresa</p>
          </div>
        )}
      </div>

      {/* CONTROLES — abajo del hero, como action bar */}
      <div className="px-4 sm:px-6 pt-3.5 sm:pt-4 pb-2 space-y-3 sm:space-y-4">
        {hasDurations && durations.length > 1 && (
          <div>
            <label className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Cantidad de días del viaje
            </label>
            <div className="flex flex-wrap gap-1.5">
              {durations.map(d => {
                const isActive = d.key === selectedDuration;
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDuration(d.key)}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-[13px] sm:text-sm font-semibold rounded-lg transition-all ${
                      isActive
                        ? `${accent.bg} ${accent.text} ring-2 ${accent.ring} shadow-sm`
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {d.dias}d · {d.noches}n
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availablePlans.length > 0 && (
          <div>
            <label className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Forma de pago</span>
              {availablePlans.length > 1 && (
                <span className="text-stone-400 font-normal">{availablePlans.length} opciones disponibles</span>
              )}
            </label>
            {availablePlans.length === 1 ? (
              <div className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-[15px] font-semibold text-noche">
                {plan.Plan_Pago || "Plan único"}
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedPlanIdx}
                  onChange={(e) => setSelectedPlanIdx(Number(e.target.value))}
                  className="w-full appearance-none bg-white border-2 border-stone-300 rounded-xl pl-4 pr-10 py-3 text-[15px] font-semibold text-noche focus:outline-none focus:border-noche hover:border-stone-400 transition-colors cursor-pointer"
                >
                  {availablePlans.map((p, i) => (
                    <option key={i} value={i}>{p.Plan_Pago}</option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        )}

        <HelpTip>{getPaymentTip(plan)}</HelpTip>
      </div>

      {/* BREAKDOWN — al firmar / anticipo / total (caption secundaria) */}
      {(upfront > 0 || hasAnticipo || plan.Total_Final) && (
        <div className="mx-4 sm:mx-6 mt-2 mb-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5 sm:p-4 space-y-2">
          {upfront > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                  <Tooltip text={GLOSARIO.alFirmar} label="Al firmar" />
                </p>
                <p className="text-[10.5px] text-stone-500 truncate">
                  {[
                    inscripcion > 0 && "inscripción",
                    reserva > 0 && "reserva",
                    hasPrimeraCuotaDistinta && "1ra cuota",
                  ].filter(Boolean).join(" + ")}
                </p>
              </div>
              <p className="font-serif text-base sm:text-lg font-semibold leading-none shrink-0 text-noche">{fmt(upfront)}</p>
            </div>
          )}
          {hasAnticipo && (
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                  <Tooltip text={GLOSARIO.anticipo} label="Anticipo antes del viaje" />
                </p>
                <p className="text-[10.5px] text-stone-500">aparte de las cuotas</p>
              </div>
              <p className="font-serif text-base sm:text-lg font-semibold leading-none shrink-0 text-noche">{fmt(plan.Anticipo_Saldo)}</p>
            </div>
          )}
          {plan.Total_Final && (
            <div className="pt-2 border-t border-stone-200 space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.14em] text-stone-500 font-semibold">
                  <Tooltip text={GLOSARIO.totalFinal} label="Total del viaje" />
                </p>
                <p className="font-serif text-lg sm:text-xl font-semibold text-noche leading-none">{fmt(plan.Total_Final)}</p>
              </div>
              {showContadoRef && (
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[10.5px] sm:text-[11px] text-stone-500">
                    <Tooltip text={GLOSARIO.contado} label="Si pagás de contado" />
                  </p>
                  <p className="font-serif text-sm sm:text-base font-semibold text-stone-700">{fmt(planContado.Total_Final)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DATOS DEL VIAJE — línea compacta */}
      {(plan.Dias || plan.Noches) && (
        <div className="px-4 sm:px-6 pt-1 pb-3 sm:pb-4 flex items-center gap-4 text-[12.5px] text-stone-600">
          {plan.Dias && (
            <span className="flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-semibold text-stone-800">{plan.Dias}</span> días
            </span>
          )}
          {plan.Noches && (
            <span className="flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-semibold text-stone-800">{plan.Noches}</span> {plan.Noches === 1 ? "noche" : "noches"}
            </span>
          )}
        </div>
      )}

      {/* ACTIVIDADES */}
      {acts.length > 0 && (
        <div className="px-4 sm:px-6 border-t border-stone-200">
          <button
            onClick={() => setShowActivities(!showActivities)}
            className="w-full flex items-center justify-between py-3 sm:py-3.5 text-[13px] sm:text-sm font-semibold text-stone-700 hover:text-noche transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Actividades incluidas
              <span className={`${accent.chip} ${accent.text} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{acts.length}</span>
            </span>
            {showActivities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showActivities && (
            <div className="pb-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="flex flex-wrap gap-1.5">
                {acts.map((a, i) => (
                  <span key={i} className={`inline-block px-2.5 py-1 ${accent.bg} border ${accent.border} rounded-md text-[12px] ${accent.text}`}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONDICIONES */}
      <div className="px-4 sm:px-6 border-t border-stone-200">
        <button
          onClick={() => setShowConditions(!showConditions)}
          className="w-full flex items-center justify-between py-3 sm:py-3.5 text-[13px] sm:text-sm font-semibold text-stone-700 hover:text-noche transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Condiciones, descuentos y vigencia
          </span>
          {showConditions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showConditions && (
          <div className="pb-4 space-y-3 animate-[fadeIn_0.2s_ease-out]">
            {plan.Liberados && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <Tooltip text={GLOSARIO.liberados} label="Pasajeros liberados" />
                </p>
                <p className="text-[13px] text-stone-700 leading-relaxed">{plan.Liberados}</p>
              </div>
            )}
            {plan.Seguro && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <Tooltip text={GLOSARIO.seguro} label="Seguro" />
                </p>
                <p className="text-[13px] text-stone-700 leading-relaxed">{plan.Seguro}</p>
              </div>
            )}
            {plan.Descuentos && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <Tooltip text={GLOSARIO.descuentos} label="Descuentos disponibles" />
                </p>
                <p className="text-[13px] text-stone-700 leading-relaxed">{plan.Descuentos}</p>
              </div>
            )}
            {plan.Vigencia && plan.Vigencia !== "-" && (
              <div className="pt-2 border-t border-stone-100">
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1">
                  <Tooltip text={GLOSARIO.vigencia} label="Vigencia y notas" />
                </p>
                <p className="text-[13px] text-stone-600 italic leading-relaxed">{plan.Vigencia}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA — Quiero este viaje */}
      <div className="px-4 sm:px-6 pt-3 pb-4 sm:pb-5 border-t border-stone-200 bg-stone-50/60">
        <QuickVote
          destino={destino}
          empresa={empresa}
          duracion={selectedDuration}
          planes={availablePlans}
          defaultNombre={defaultNombre}
          onVoted={onVoted}
        />
      </div>
    </div>
  );
}

// === WIZARD ===
const STEPS = [
  { key: "duracion", label: "Días",      icon: CalendarClock },
  { key: "destino",  label: "Destino",   icon: MapPin },
  { key: "plan",     label: "Opciones",  icon: Wallet },
];

function WizardView({ groupedDestinations, defaultNombre, onVoted }) {
  const [step, setStep] = useState(0);
  const [duracion, setDuracion] = useState(null);
  const [destino, setDestino] = useState(null);

  const reset = () => { setStep(0); setDuracion(null); setDestino(null); };

  // Step 0: unique durations across all data
  const duracionOptions = useMemo(() => {
    const set = new Set();
    groupedDestinations.forEach(g => {
      g.planes.forEach(p => {
        if (p.Dias && p.Noches) set.add(`${p.Dias}|${p.Noches}`);
      });
    });
    return Array.from(set).map(d => {
      const [dias, noches] = d.split("|").map(Number);
      return { dias, noches, key: d };
    }).sort((a, b) => a.dias - b.dias);
  }, [groupedDestinations]);

  // Step 1: destinations that have the selected duration, grouped by provincia
  const destinoOptions = useMemo(() => {
    if (!duracion) return [];
    const [dias, noches] = duracion.split("|").map(Number);
    const buckets = {};
    for (const g of groupedDestinations) {
      const hasDur = g.planes.some(p => p.Dias === dias && p.Noches === noches);
      if (!hasDur) continue;
      const prov = guessProvincia(g.destino);
      if (!buckets[prov]) buckets[prov] = new Set();
      buckets[prov].add(g.destino);
    }
    const provs = Object.keys(buckets);
    provs.sort((a, b) => {
      const ia = PROVINCIA_ORDER.indexOf(a);
      const ib = PROVINCIA_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return provs.map(p => ({
      provincia: p,
      destinos: Array.from(buckets[p]).sort((a, b) => {
        const af = DESTINO_FEATURED.has(a) ? 0 : 1;
        const bf = DESTINO_FEATURED.has(b) ? 0 : 1;
        return af - bf || a.localeCompare(b);
      }),
    }));
  }, [groupedDestinations, duracion]);

  // Step 2: filtered cards sorted by cheapest cuota mensual
  const resultCards = useMemo(() => {
    const filtered = groupedDestinations.filter(g => {
      if (destino && g.destino !== destino) return false;
      if (duracion) {
        const [dias, noches] = duracion.split("|").map(Number);
        return g.planes.some(p => p.Dias === dias && p.Noches === noches);
      }
      return true;
    });
    // Sort by cheapest cuota mensual
    const minCuota = (g) => {
      const cs = g.planes.map(p => p.Cuota_Mensual).filter(v => v != null && !isNaN(v) && v > 0);
      return cs.length ? Math.min(...cs) : Infinity;
    };
    const minTotal = (g) => {
      const ts = g.planes.map(p => p.Total_Final).filter(v => v != null && !isNaN(v) && v > 0);
      return ts.length ? Math.min(...ts) : Infinity;
    };
    return filtered.sort((a, b) => minCuota(a) - minCuota(b) || minTotal(a) - minTotal(b));
  }, [groupedDestinations, destino, duracion]);

  // Auto-advance if only one destination for the selected duration
  useEffect(() => {
    if (step === 1) {
      const allDestinos = destinoOptions.flatMap(g => g.destinos);
      if (allDestinos.length === 1 && !destino) {
        setDestino(allDestinos[0]);
        setStep(2);
      }
    }
  }, [step, destinoOptions, destino]);

  const goBack = () => {
    if (step === 2) {
      const allDestinos = destinoOptions.flatMap(g => g.destinos);
      if (allDestinos.length === 1) {
        setDestino(null);
        setDuracion(null);
        setStep(0);
      } else {
        setDestino(null);
        setStep(1);
      }
    } else if (step === 1) {
      setDuracion(null);
      setStep(0);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={s.key}
                onClick={() => {
                  if (i < step) {
                    if (i === 0) { setDuracion(null); setDestino(null); setStep(0); }
                    else if (i === 1) { setDestino(null); setStep(1); }
                  }
                }}
                disabled={i > step}
                className={`flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold transition-all px-2 py-1 rounded-lg ${
                  active ? "text-noche bg-stone-200"
                  : done ? "text-stone-700 hover:bg-stone-100 cursor-pointer"
                  : "text-stone-400"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  active ? "bg-stone-900 text-white"
                  : done ? "bg-fogata text-white"
                  : "bg-stone-200 text-stone-400"
                }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div className="h-full bg-stone-900 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[320px]">

        {/* STEP 0: Duración */}
        {step === 0 && (
          <div className="animate-[fadeIn_0.25s_ease-out]">
            <h2 className="font-serif text-2xl sm:text-3xl text-noche tracking-tight mb-1">¿Cuántos días de viaje?</h2>
            <p className="text-stone-500 text-sm mb-5">Elegí la duración del viaje de egresados</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {duracionOptions.map(d => {
                // Count destinations and companies for this duration
                const matchingCards = groupedDestinations.filter(g =>
                  g.planes.some(p => p.Dias === d.dias && p.Noches === d.noches)
                );
                const destCount = new Set(matchingCards.map(g => g.destino)).size;
                const empCount = new Set(matchingCards.map(g => g.empresa)).size;
                return (
                  <button
                    key={d.key}
                    onClick={() => { setDuracion(d.key); setDestino(null); setStep(1); }}
                    className="flex items-center gap-3 px-4 py-4 bg-white border-2 border-stone-200 rounded-xl text-left hover:border-stone-400 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-6 h-6 text-stone-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-noche text-lg">{d.dias} días · {d.noches} {d.noches === 1 ? "noche" : "noches"}</p>
                      <p className="text-[12px] text-stone-500">{destCount} {destCount === 1 ? "destino" : "destinos"} · {empCount} {empCount === 1 ? "empresa" : "empresas"}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: Destino */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.25s_ease-out]">
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-3 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Cambiar duración
            </button>
            <h2 className="font-serif text-2xl sm:text-3xl text-noche tracking-tight mb-1">¿A dónde quieren ir?</h2>
            <p className="text-stone-500 text-sm mb-5">
              Destinos disponibles para viajes de <span className="font-semibold text-stone-700">{duracion && duracion.replace("|", " días · ")} noches</span>
            </p>
            <div className="space-y-6">
              {destinoOptions.map(({ provincia, destinos }) => (
                <div key={provincia}>
                  <p className="text-[10.5px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-2.5 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {provincia}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {destinos.map(d => {
                      const [dias, noches] = duracion.split("|").map(Number);
                      const matchingCards = groupedDestinations.filter(g =>
                        g.destino === d && g.planes.some(p => p.Dias === dias && p.Noches === noches)
                      );
                      const empCount = new Set(matchingCards.map(g => g.empresa)).size;
                      const minC = Math.min(...matchingCards.flatMap(g => g.planes.map(p => p.Cuota_Mensual)).filter(v => v != null && v > 0));
                      return (
                        <button
                          key={d}
                          onClick={() => { setDestino(d); setStep(2); }}
                          className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-stone-200 rounded-xl text-left hover:border-stone-400 hover:shadow-md transition-all group"
                        >
                          <MapPin className="w-5 h-5 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-noche text-[15px] truncate">{d}</p>
                            <p className="text-[12px] text-stone-500">{empCount} {empCount === 1 ? "empresa" : "empresas"}</p>
                            {isFinite(minC) && (
                              <p className="text-[12px] text-pino font-semibold">desde {fmt(minC)}/mes</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Resultados ordenados por precio */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.25s_ease-out]">
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-3 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Atrás
            </button>
            <h2 className="font-serif text-2xl sm:text-3xl text-noche tracking-tight mb-1">Opciones de menor a mayor precio</h2>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {duracion && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200 text-stone-800 rounded-full text-sm font-semibold">
                  <CalendarClock className="w-3.5 h-3.5" /> {duracion.replace("|", "d · ")}n
                </span>
              )}
              {destino && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200 text-stone-800 rounded-full text-sm font-semibold">
                  <MapPin className="w-3.5 h-3.5" /> {destino}
                </span>
              )}
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors"
              >
                <Search className="w-3.5 h-3.5" /> Nueva búsqueda
              </button>
            </div>
            <p className="text-stone-500 text-sm mb-4">{resultCards.length} {resultCards.length === 1 ? "opción encontrada" : "opciones encontradas"}, ordenadas por cuota más baja</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7 sm:gap-6">
              {resultCards.map(g => (
                <DestinationCard
                  key={`${g.empresa}-${g.destino}-${g.transporte}`}
                  empresa={g.empresa}
                  destino={g.destino}
                  planes={g.planes}
                  defaultNombre={defaultNombre}
                  onVoted={onVoted}
                />
              ))}
            </div>
            {resultCards.length === 0 && (
              <div className="text-center py-12">
                <p className="text-stone-500 text-lg">No se encontraron resultados con esos filtros.</p>
                <button onClick={reset} className="mt-3 text-stone-700 font-semibold underline">Empezar de nuevo</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// === QUICK VOTE (botón inline en resultados del wizard) ===
function QuickVote({ destino, empresa, duracion, planes = [], defaultNombre = "", onVoted }) {
  const [step, setStep] = useState(0); // 0=closed, 1=nombre, 2=prioridad, 3=plan, 4=confirm
  const [nombre, setNombre] = useState(defaultNombre);
  const [prioridad, setPrioridad] = useState(null); // 1, 2, 3
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  // Planes únicos de pago disponibles para este card
  const planOptions = useMemo(() => {
    return planes
      .filter(p => p.Plan_Pago && p.Total_Final)
      .map(p => ({
        plan_pago: p.Plan_Pago,
        total_final: p.Total_Final,
        cuota_mensual: p.Cuota_Mensual || null,
        cantidad_cuotas: p.Cantidad_Cuotas || null,
      }))
      .sort((a, b) => a.total_final - b.total_final);
  }, [planes]);

  const fmtPrice = (n) => n != null ? `$${Number(n).toLocaleString("es-AR")}` : null;

  const handleVote = async () => {
    if (!nombre.trim()) return;
    if (!supabase) { setError("Votación no disponible (configuración pendiente)"); return; }
    setSending(true);
    setError(null);
    const row = {
      nombre: nombre.trim(),
      destino,
      empresa,
      duracion: duracion || null,
      prioridad,
      plan_pago: selectedPlan?.plan_pago || null,
      total_final: selectedPlan?.total_final || null,
      cuota_mensual: selectedPlan?.cuota_mensual || null,
    };
    const { error: err } = await supabase.from("votos").insert(row);
    setSending(false);
    if (err) { setError("Error al votar: " + err.message); return; }
    setDone(true);
    if (onVoted) setTimeout(() => onVoted(), 1200);
  };

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-3.5 bg-hojas/20 border-2 border-hojas rounded-2xl text-pino font-semibold animate-[fadeIn_0.2s_ease-out]">
        <CheckCircle2 className="w-5 h-5 text-fogata" />
        <span>¡Voto registrado!</span>
      </div>
    );
  }

  if (step === 0) {
    return (
      <button
        onClick={() => setStep(defaultNombre ? 2 : 1)}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-pino hover:bg-pino/90 active:bg-pino/80 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg text-[15px]"
      >
        <Vote className="w-5 h-5" />
        ¡Quiero este viaje!
      </button>
    );
  }

  return (
    <div className="bg-hojas/20 border-2 border-pino/40 rounded-2xl p-3.5 space-y-2.5 animate-[fadeIn_0.15s_ease-out]">
      {/* Step 1: Nombre */}
      {step === 1 && (
        <>
          <p className="text-[13px] text-pino font-semibold">① Ingresá tu nombre</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nombre.trim() && setStep(2)}
              placeholder="Ej: Familia García"
              autoFocus
              className="flex-1 min-w-0 bg-white border-2 border-pino/40 rounded-xl px-3.5 py-2.5 text-[15px] text-noche focus:outline-none focus:border-pino transition-colors"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!nombre.trim()}
              className="px-4 py-2.5 bg-pino hover:bg-pino/90 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors shrink-0 text-[14px]"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {/* Step 2: Prioridad */}
      {step === 2 && (
        <>
          <p className="text-[13px] text-pino font-semibold">② ¿Qué preferencia es este viaje?</p>
          <div className="space-y-1.5">
            {[{n:1, label:"1ra opción", desc:"Mi primera elección", color:"bg-fogata"}, {n:2, label:"2da opción", desc:"Mi segunda elección", color:"bg-stone-300"}, {n:3, label:"3ra opción", desc:"Mi tercera elección", color:"bg-orange-300"}].map(({n, label, desc, color}) => (
              <button
                key={n}
                onClick={() => { setPrioridad(n); setStep(planOptions.length > 0 ? 3 : 4); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-[13px] transition-colors flex items-center gap-2.5 ${prioridad === n ? "border-pino bg-hojas/30" : "border-stone-200 bg-white hover:bg-hojas/20"}`}
              >
                <span className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-white font-bold text-[12px] shrink-0`}>{n}</span>
                <span><span className="font-semibold text-stone-800">{label}</span> <span className="text-stone-400">— {desc}</span></span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="text-pino/50 hover:text-pino text-[12px]">← Atrás</button>
        </>
      )}

      {/* Step 3: Elegir plan de pago */}
      {step === 3 && (
        <>
          <p className="text-[13px] text-pino font-semibold">③ Elegí forma de pago <span className="font-normal text-pino/70">(opcional)</span></p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            <button
              onClick={() => { setSelectedPlan(null); setStep(4); }}
              className={`w-full text-left px-3 py-2 rounded-lg border text-[13px] transition-colors ${!selectedPlan ? "border-pino bg-hojas/30" : "border-stone-200 bg-white hover:bg-hojas/20"}`}
            >
              <span className="text-stone-600">Sin preferencia</span>
            </button>
            {planOptions.map((p, i) => (
              <button
                key={i}
                onClick={() => { setSelectedPlan(p); setStep(4); }}
                className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-hojas/20 hover:border-pino/60 text-[13px] transition-colors"
              >
                <span className="font-semibold text-stone-800">{p.plan_pago}</span>
                <span className="text-stone-500 ml-1.5">
                  Total {fmtPrice(p.total_final)}
                  {p.cuota_mensual ? ` · Cuota ${fmtPrice(p.cuota_mensual)}` : ""}
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="text-pino/50 hover:text-pino text-[12px]">← Atrás</button>
        </>
      )}

      {/* Step 4: Confirmar */}
      {step === 4 && (
        <>
          <p className="text-[13px] text-pino font-semibold">{planOptions.length > 0 ? "④" : "③"} Confirmar voto</p>
          <div className="bg-white rounded-lg px-3 py-2 text-[13px] space-y-0.5">
            <p className="text-stone-700"><span className="font-semibold">Nombre:</span> {nombre}</p>
            <p className="text-stone-700"><span className="font-semibold">Preferencia:</span> {prioridad === 1 ? "1ra opción" : prioridad === 2 ? "2da opción" : "3ra opción"}</p>
            <p className="text-stone-700"><span className="font-semibold">Viaje:</span> {empresa} → {destino}</p>
            {duracion && <p className="text-stone-700"><span className="font-semibold">Duración:</span> {duracion.replace("|", "d/")}n</p>}
            {selectedPlan && (
              <p className="text-stone-700">
                <span className="font-semibold">Plan:</span> {selectedPlan.plan_pago} · Total {fmtPrice(selectedPlan.total_final)}
                {selectedPlan.cuota_mensual ? ` · Cuota ${fmtPrice(selectedPlan.cuota_mensual)}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep(planOptions.length > 0 ? 3 : 2)}
              className="px-3 py-2.5 text-pino hover:text-pino font-semibold text-[13px]"
            >
              ← Atrás
            </button>
            <button
              onClick={handleVote}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pino hover:bg-pino/90 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors text-[15px]"
            >
              <Send className="w-4 h-4" />
              {sending ? "..." : "Confirmar voto"}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-red-600 text-[13px] font-medium">{error}</p>}
      {step === 1 && (
        <button onClick={() => setStep(0)} className="text-pino/50 hover:text-pino text-[12px]">
          Cancelar
        </button>
      )}
    </div>
  );
}

// === RESULTADOS DE VOTACIÓN ===
// Helper: barras horizontales reutilizable
function BarList({ items, color }) {
  const max = items.length ? items[0][1] : 0;
  const total = items.reduce((s, [, c]) => s + c, 0);
  return (
    <div className="space-y-2.5">
      {items.map(([label, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barWidth = max > 0 ? (count / max) * 100 : 0;
        return (
          <div key={label}>
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                {i === 0 && items.length > 1 && <span className="text-fogata">🏆</span>}
                {label}
              </span>
              <span className="text-[12px] text-stone-500 font-semibold">{count} · {pct}%</span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${i === 0 ? color : "bg-stone-300"}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VotingResults() {
  const [votos, setVotos] = useState([]);
  const [loadingVotos, setLoadingVotos] = useState(true);

  const fetchVotos = useCallback(async () => {
    if (!supabase) { setLoadingVotos(false); return; }
    const { data } = await supabase.from("votos").select("*").order("created_at", { ascending: false });
    if (data) setVotos(data);
    setLoadingVotos(false);
  }, []);

  useEffect(() => { fetchVotos(); }, [fetchVotos]);

  const totalVotos = votos.length;

  // 1. Por destino
  const byDestino = useMemo(() => {
    const counts = {};
    votos.forEach(v => {
      const key = v.destino || "Sin destino";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [votos]);

  // 2. Por empresa + destino
  const byEmpresaDestino = useMemo(() => {
    const counts = {};
    votos.forEach(v => {
      const emp = v.empresa || "Sin empresa";
      const key = `${emp} → ${v.destino || "Sin destino"}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [votos]);

  // 3. Por empresa + destino + duración
  const byEmpresaDestinoDias = useMemo(() => {
    const counts = {};
    votos.forEach(v => {
      const emp = v.empresa || "Sin empresa";
      const dest = v.destino || "Sin destino";
      let dur = "";
      if (v.duracion) {
        const [d, n] = v.duracion.split("|");
        dur = ` · ${d}d/${n}n`;
      }
      const key = `${emp} → ${dest}${dur}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [votos]);

  const fmtPrice = (n) => `$${Number(n).toLocaleString("es-AR")}`;

  // 4. Por forma de pago (plan_pago)
  const byPlanPago = useMemo(() => {
    const counts = {};
    votos.forEach(v => {
      if (!v.plan_pago) return;
      counts[v.plan_pago] = (counts[v.plan_pago] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [votos]);

  // 4b. Por prioridad
  const byPrioridad = useMemo(() => {
    const labels = { 1: "1ra opción", 2: "2da opción", 3: "3ra opción" };
    const counts = { 1: 0, 2: 0, 3: 0 };
    votos.forEach(v => { if (v.prioridad) counts[v.prioridad] = (counts[v.prioridad] || 0) + 1; });
    return [1, 2, 3].map(n => [labels[n], counts[n]]).filter(([, c]) => c > 0);
  }, [votos]);

  // 4c. Por destino ponderado (1ra=3pts, 2da=2pts, 3ra=1pt)
  const byDestinoPonderado = useMemo(() => {
    const scores = {};
    const weights = { 1: 3, 2: 2, 3: 1 };
    votos.forEach(v => {
      if (!v.destino || !v.prioridad) return;
      scores[v.destino] = (scores[v.destino] || 0) + (weights[v.prioridad] || 1);
    });
    return Object.entries(scores).sort((a, b) => b[1] - a[1]);
  }, [votos]);

  // 5. Por costo total (rangos)
  const byCostoTotal = useMemo(() => {
    const ranges = [
      [0, 500000, "Hasta $500.000"],
      [500000, 800000, "$500.000 – $800.000"],
      [800000, 1000000, "$800.000 – $1.000.000"],
      [1000000, 1500000, "$1.000.000 – $1.500.000"],
      [1500000, Infinity, "Más de $1.500.000"],
    ];
    const counts = {};
    votos.forEach(v => {
      if (v.total_final == null) return;
      const r = ranges.find(([lo, hi]) => v.total_final >= lo && v.total_final < hi);
      if (r) counts[r[2]] = (counts[r[2]] || 0) + 1;
    });
    // Mantener orden por rango, no por count
    return ranges.map(([, , label]) => [label, counts[label] || 0]).filter(([, c]) => c > 0);
  }, [votos]);

  // 6. Por cuota mensual (rangos)
  const byCuota = useMemo(() => {
    const ranges = [
      [0, 50000, "Hasta $50.000/mes"],
      [50000, 100000, "$50.000 – $100.000/mes"],
      [100000, 200000, "$100.000 – $200.000/mes"],
      [200000, Infinity, "Más de $200.000/mes"],
    ];
    const counts = {};
    votos.forEach(v => {
      if (v.cuota_mensual == null) return;
      const r = ranges.find(([lo, hi]) => v.cuota_mensual >= lo && v.cuota_mensual < hi);
      if (r) counts[r[2]] = (counts[r[2]] || 0) + 1;
    });
    return ranges.map(([, , label]) => [label, counts[label] || 0]).filter(([, c]) => c > 0);
  }, [votos]);

  return (
    <div className="animate-[fadeIn_0.3s_ease-out] max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-hojas/40 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-pino" />
        </div>
        <div>
          <h3 className="font-serif text-2xl text-noche">Resultados</h3>
          <p className="text-[12px] text-stone-500">{totalVotos} {totalVotos === 1 ? "voto" : "votos"} hasta ahora</p>
        </div>
      </div>

      {loadingVotos ? (
        <p className="text-stone-400 text-sm py-8 text-center">Cargando votos...</p>
      ) : byDestino.length === 0 ? (
        <div className="text-center py-12 bg-white border border-stone-200 rounded-2xl">
          <Vote className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-400 text-sm">Todavía no hay votos. ¡Sé el primero!</p>
        </div>
      ) : (
        <>
          {/* POR DESTINO */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-fogata" />
              <h4 className="font-semibold text-noche text-[15px]">Por destino</h4>
            </div>
            <BarList items={byDestino} color="bg-fogata" />
          </div>

          {/* RANKING PONDERADO POR PREFERENCIA */}
          {byDestinoPonderado.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-fogata" />
                <h4 className="font-semibold text-noche text-[15px]">Ranking por preferencia</h4>
              </div>
              <p className="text-[11px] text-stone-400 mb-3">1ra opción = 3 pts, 2da = 2 pts, 3ra = 1 pt</p>
              <BarList items={byDestinoPonderado} color="bg-fogata" />
            </div>
          )}

          {/* POR PRIORIDAD */}
          {byPrioridad.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-pino/70" />
                <h4 className="font-semibold text-noche text-[15px]">Votos por orden de preferencia</h4>
              </div>
              <BarList items={byPrioridad} color="bg-pino" />
            </div>
          )}

          {/* POR EMPRESA + DESTINO */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-noche text-[15px]">Por empresa y destino</h4>
            </div>
            <BarList items={byEmpresaDestino} color="bg-blue-500" />
          </div>

          {/* POR EMPRESA + DESTINO + DÍAS */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-pino" />
              <h4 className="font-semibold text-noche text-[15px]">Por empresa, destino y días</h4>
            </div>
            <BarList items={byEmpresaDestinoDias} color="bg-pino" />
          </div>

          {/* POR FORMA DE PAGO */}
          {byPlanPago.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-fogata" />
                <h4 className="font-semibold text-noche text-[15px]">Por forma de pago</h4>
              </div>
              <BarList items={byPlanPago} color="bg-fogata" />
            </div>
          )}

          {/* POR COSTO TOTAL */}
          {byCostoTotal.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-teal-600" />
                <h4 className="font-semibold text-noche text-[15px]">Por costo total elegido</h4>
              </div>
              <BarList items={byCostoTotal} color="bg-teal-500" />
            </div>
          )}

          {/* POR CUOTA MENSUAL */}
          {byCuota.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-rose-600" />
                <h4 className="font-semibold text-noche text-[15px]">Por cuota mensual elegida</h4>
              </div>
              <BarList items={byCuota} color="bg-rose-500" />
            </div>
          )}
        </>
      )}

      {/* Últimos votos */}
      {votos.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
          <p className="text-[10.5px] uppercase tracking-[0.2em] text-stone-400 font-bold mb-3">Últimos votos</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {votos.slice(0, 15).map(v => (
              <div key={v.id} className="flex items-center gap-x-2 text-[13px]">
                {v.prioridad && (
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 ${v.prioridad === 1 ? "bg-fogata" : v.prioridad === 2 ? "bg-stone-400" : "bg-orange-400"}`}>{v.prioridad}</span>
                )}
                <span className="font-semibold text-stone-700">{v.nombre}</span>
                <span className="text-stone-400">→</span>
                <span className="text-stone-600">{v.destino}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// === MAIN ===
export default function App() {
  const [familia, setFamilia] = useState(() => localStorage.getItem("egresados_familia") || "");
  const [familiaInput, setFamiliaInput] = useState("");
  const [totalVotos, setTotalVotos] = useState(null);

  // Fetch total votos on mount
  useEffect(() => {
    if (!supabase) return;
    supabase.from("votos").select("id", { count: "exact", head: true }).then(({ count }) => {
      if (count != null) setTotalVotos(count);
    });
  }, []);

  const handleFamiliaSubmit = () => {
    const val = familiaInput.trim();
    if (!val) return;
    localStorage.setItem("egresados_familia", val);
    setFamilia(val);
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }, []);

  const groupedDestinations = useMemo(() => {
    // Agrupamos por (Empresa, Destino, Transporte). Si una empresa ofrece el mismo destino
    // en avión y en bus, cada transporte es una card separada — si no, los planes de bus
    // quedarían escondidos dentro del select de la card de avión.
    const groups = {};
    RAW.forEach(r => {
      const key = `${r.Empresa}|||${r.Destino}|||${r.Transporte || ""}`;
      if (!groups[key]) groups[key] = { empresa: r.Empresa, destino: r.Destino, transporte: r.Transporte, planes: [] };
      groups[key].planes.push(r);
    });

    let arr = Object.values(groups);
    arr.sort((a, b) =>
      a.empresa.localeCompare(b.empresa) ||
      a.destino.localeCompare(b.destino) ||
      (a.transporte || "").localeCompare(b.transporte || "")
    );
    return arr;
  }, []);

  // Helpers de orden por precio: priorizamos cuota mensual mínima (lo que la familia paga
  // mes a mes, alineado con el HERO de la card). Fallback a Total_Final mínimo si la card
  // no tiene ningún plan con cuota mensual. Cards sin nada → al final.
  const minCuota = (g) => {
    const cs = g.planes.map(p => p.Cuota_Mensual).filter(v => v != null && !isNaN(v) && v > 0);
    return cs.length ? Math.min(...cs) : Infinity;
  };
  const minTotal = (g) => {
    const ts = g.planes.map(p => p.Total_Final).filter(v => v != null && !isNaN(v) && v > 0);
    return ts.length ? Math.min(...ts) : Infinity;
  };
  const cmpPrice = (a, b) =>
    minCuota(a) - minCuota(b) ||
    minTotal(a) - minTotal(b) ||
    a.empresa.localeCompare(b.empresa) ||
    a.destino.localeCompare(b.destino) ||
    (a.transporte || "").localeCompare(b.transporte || "");

  const sortedByPrice = useMemo(() => {
    return [...groupedDestinations].sort(cmpPrice);
  }, [groupedDestinations]);

  const groupedByProvincia = useMemo(() => {
    const buckets = {};
    for (const g of groupedDestinations) {
      const prov = guessProvincia(g.destino);
      (buckets[prov] ??= []).push(g);
    }
    for (const arr of Object.values(buckets)) arr.sort(cmpPrice);

    const provs = Object.keys(buckets);
    provs.sort((a, b) => {
      const ia = PROVINCIA_ORDER.indexOf(a);
      const ib = PROVINCIA_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return provs.map(p => ({ provincia: p, items: buckets[p] }));
  }, [groupedDestinations]);

  const groupedByEmpresa = useMemo(() => {
    const buckets = {};
    for (const g of groupedDestinations) (buckets[g.empresa] ??= []).push(g);
    for (const arr of Object.values(buckets)) arr.sort(cmpPrice);
    // Empresas ordenadas por la cuota mínima de cualquiera de sus cards (más barata primero).
    return Object.keys(buckets)
      .sort((a, b) => Math.min(...buckets[a].map(minCuota)) - Math.min(...buckets[b].map(minCuota)) || a.localeCompare(b))
      .map(empresa => ({ empresa, items: buckets[empresa] }));
  }, [groupedDestinations]);

  const [tab, setTab] = useState("precio");
  const [viewMode, setViewMode] = useState("wizard"); // "wizard" | "grid" | "resultados"
  const [misVotos, setMisVotos] = useState([]); // votos del familia actual

  // Cargar votos propios cuando hay familia
  useEffect(() => {
    if (!familia || !supabase) { setMisVotos([]); return; }
    let cancelled = false;
    supabase.from("votos").select("prioridad,destino,empresa,plan_pago").eq("nombre", familia).then(({ data, error }) => {
      if (cancelled || error) return;
      setMisVotos(data || []);
    });
    return () => { cancelled = true; };
  }, [familia, totalVotos]);

  const votosPorPrioridad = useMemo(() => {
    const m = { 1: null, 2: null, 3: null };
    misVotos.forEach(v => { if (v.prioridad && !m[v.prioridad]) m[v.prioridad] = v; });
    return m;
  }, [misVotos]);

  const stats = useMemo(() => ({
    empresas: new Set(groupedDestinations.map(g => g.empresa)).size,
    destinos: groupedDestinations.length,
    planes: groupedDestinations.reduce((acc, g) => acc + g.planes.length, 0),
    provincias: groupedByProvincia.length,
  }), [groupedDestinations, groupedByProvincia]);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Modal identificación familia */}
      {!familia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-hojas/30 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-pino" />
              </div>
              <h2 className="font-serif text-2xl text-noche mb-1">¡Hola!</h2>
              <p className="text-stone-500 text-sm">¿De qué familia o alumno/a estamos viendo viajes?</p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={familiaInput}
                onChange={(e) => setFamiliaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFamiliaSubmit()}
                placeholder="Ej: Familia García / Lucía García"
                autoFocus
                className="w-full bg-white border-2 border-stone-200 rounded-xl px-4 py-3 text-[16px] text-noche focus:outline-none focus:border-pino transition-colors"
              />
              <button
                onClick={handleFamiliaSubmit}
                disabled={!familiaInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pino hover:bg-pino/90 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors text-[15px]"
              >
                Empezar a comparar
              </button>
            </div>
            {totalVotos != null && totalVotos > 0 && (
              <p className="text-center text-stone-400 text-[12px] mt-4">{totalVotos} {totalVotos === 1 ? "familia ya votó" : "familias ya votaron"}</p>
            )}
          </div>
        </div>
      )}

      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 via-green-500 via-cyan-500 via-blue-500 to-fuchsia-500" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-12">

        {/* HEADER */}
        <div className="mb-5 sm:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 sm:mb-2">
            <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] sm:tracking-[0.25em] text-stone-500 font-bold">Comparativa 2026</p>
            {familia && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-stone-500">
                  <span className="font-semibold text-stone-700">{familia}</span>
                  {totalVotos != null && <span className="ml-2 text-stone-400">· {totalVotos} {totalVotos === 1 ? "voto" : "votos"} totales</span>}
                </span>
                <button
                  onClick={() => { localStorage.removeItem("egresados_familia"); setFamilia(""); setFamiliaInput(""); }}
                  className="text-[11px] text-stone-400 hover:text-stone-600 underline"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-noche tracking-tight leading-none mb-2.5 sm:mb-4">
            Viajes de <em className="text-stone-700">egresados</em>
          </h1>
          <p className="text-stone-600 max-w-2xl text-[14px] sm:text-base leading-relaxed">
            Compará cuotas mensuales, formas de pago y duración. Tocá cualquier ícono <Info className="inline w-3.5 h-3.5 align-text-bottom" /> para ver una explicación en términos simples.
          </p>

          {/* ESTADO DE VOTACIÓN — explícito qué prioridades ya votó la familia */}
          {familia && (
            <div className="mt-4 sm:mt-5">
              <p className="text-[10.5px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-2">Tu votación</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl">
                {[1, 2, 3].map(n => {
                  const v = votosPorPrioridad[n];
                  const label = n === 1 ? "1ra opción" : n === 2 ? "2da opción" : "3ra opción";
                  const dotColor = n === 1 ? "bg-fogata" : n === 2 ? "bg-hojas" : "bg-tierra";
                  if (v) {
                    return (
                      <div key={n} className="flex items-start gap-2 px-2.5 py-2 bg-pino-light border border-pino/30 rounded-lg">
                        <span className={`w-5 h-5 rounded-full ${dotColor} flex items-center justify-center text-white font-bold text-[11px] shrink-0 mt-0.5`}>{n}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10.5px] uppercase tracking-wider text-pino font-bold leading-tight">{label} <CheckCircle2 className="inline w-3 h-3 ml-0.5" strokeWidth={2.5} /></p>
                          <p className="text-[12px] text-noche font-semibold truncate leading-tight mt-0.5">{v.destino}</p>
                          <p className="text-[10.5px] text-stone-500 truncate leading-tight">{v.empresa}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={n} className="flex items-center gap-2 px-2.5 py-2 bg-white border-2 border-dashed border-stone-300 rounded-lg">
                      <span className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-[11px] shrink-0">{n}</span>
                      <div className="min-w-0">
                        <p className="text-[10.5px] uppercase tracking-wider text-stone-500 font-bold leading-tight">{label}</p>
                        <p className="text-[11px] text-stone-400 leading-tight mt-0.5">Falta votar</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <GuideBanner />

        {/* TOGGLE WIZARD / GRID */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-xl">
            <button
              onClick={() => setViewMode("wizard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "wizard"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-noche hover:bg-stone-50"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Buscar viaje
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-noche hover:bg-stone-50"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Ver todo
            </button>
            <button
              onClick={() => setViewMode("resultados")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "resultados"
                  ? "bg-pino text-white shadow-sm"
                  : "text-stone-600 hover:text-noche hover:bg-stone-50"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Resultados
            </button>
          </div>

          {viewMode === "grid" && (
            <div className="flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-xl">
              <button
                onClick={() => setTab("precio")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === "precio"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-600 hover:text-noche hover:bg-stone-50"
                }`}
              >
                <Wallet className="w-4 h-4" />
                Por cuota
              </button>
              <button
                onClick={() => setTab("provincia")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === "provincia"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-600 hover:text-noche hover:bg-stone-50"
                }`}
              >
                <MapPin className="w-4 h-4" />
                Por provincia
              </button>
              <button
                onClick={() => setTab("empresa")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === "empresa"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-600 hover:text-noche hover:bg-stone-50"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Por empresa
              </button>
            </div>
          )}
        </div>

        {/* WIZARD VIEW */}
        {viewMode === "wizard" && (
          <WizardView groupedDestinations={groupedDestinations} defaultNombre={familia} onVoted={() => { setViewMode("resultados"); setTotalVotos(v => v != null ? v + 1 : 1); }} />
        )}

        {/* RESULTADOS */}
        {viewMode === "resultados" && (
          <VotingResults />
        )}

        {/* GRID — DEPENDE DEL TAB */}
        {viewMode === "grid" && tab === "precio" && (
          <div>
            <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-stone-300">
              <Wallet className="w-5 h-5 text-stone-700 shrink-0 self-center" strokeWidth={1.8} />
              <h2 className="font-serif text-3xl text-noche tracking-tight">De menor a mayor cuota mensual</h2>
              <span className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-bold ml-auto">
                {sortedByPrice.length} tarjetas
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7 sm:gap-6">
              {sortedByPrice.map(g => (
                <DestinationCard
                  key={`${g.empresa}-${g.destino}-${g.transporte}`}
                  empresa={g.empresa}
                  destino={g.destino}
                  planes={g.planes}
                  defaultNombre={familia}
                  onVoted={() => setTotalVotos(v => v != null ? v + 1 : 1)}
                />
              ))}
            </div>
          </div>
        )}

        {viewMode === "grid" && tab === "provincia" && (
          <div className="space-y-12">
            {groupedByProvincia.map(({ provincia, items }) => (
              <section key={provincia}>
                <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-stone-300">
                  <MapPin className="w-5 h-5 text-stone-700 shrink-0 self-center" strokeWidth={1.8} />
                  <h2 className="font-serif text-3xl text-noche tracking-tight">{provincia}</h2>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-bold ml-auto">
                    {items.length} {items.length === 1 ? "tarjeta" : "tarjetas"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7 sm:gap-6">
                  {items.map(g => (
                    <DestinationCard
                      key={`${g.empresa}-${g.destino}-${g.transporte}`}
                      empresa={g.empresa}
                      destino={g.destino}
                      planes={g.planes}
                      defaultNombre={familia}
                      onVoted={() => setTotalVotos(v => v != null ? v + 1 : 1)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {viewMode === "grid" && tab === "empresa" && (
          <div className="space-y-12">
            {groupedByEmpresa.map(({ empresa, items }) => {
              const accent = COMPANY_ACCENT[empresa] || COMPANY_ACCENT["Flecha"];
              return (
                <section key={empresa}>
                  <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-stone-300">
                    <span className={`w-3 h-3 rounded-full ${accent.dot} self-center shrink-0`} />
                    <h2 className={`font-serif text-3xl tracking-tight ${accent.text}`}>{empresa}</h2>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-bold ml-auto">
                      {items.length} {items.length === 1 ? "tarjeta" : "tarjetas"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7 sm:gap-6">
                    {items.map(g => (
                      <DestinationCard
                        key={`${g.empresa}-${g.destino}-${g.transporte}`}
                        empresa={g.empresa}
                        destino={g.destino}
                        planes={g.planes}
                        defaultNombre={familia}
                        onVoted={() => setTotalVotos(v => v != null ? v + 1 : 1)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* RESUMEN INFORMATIVO — sin protagonismo, al pie */}
        <div className="mt-16 pt-6 border-t border-stone-200">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold mb-3 text-center sm:text-left">
            Datos del comparativo
          </p>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-stone-500 justify-center sm:justify-start">
            <p className="text-[13px]"><span className="font-semibold text-stone-700">{stats.provincias}</span> provincias</p>
            <p className="text-[13px]"><span className="font-semibold text-stone-700">{stats.empresas}</span> empresas</p>
            <p className="text-[13px]"><span className="font-semibold text-stone-700">{stats.destinos}</span> destinos</p>
            <p className="text-[13px]"><span className="font-semibold text-stone-700">{stats.planes}</span> planes de pago</p>
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t border-stone-100 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 font-semibold">
            Datos de comparativa · Buenos Aires · 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
