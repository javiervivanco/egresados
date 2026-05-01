import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Bus, Plane, MapPin, Bed, Lightbulb, Users, Shield, Tag, Sparkles, Calculator, BookOpen, Wallet, CalendarClock, Info, CheckCircle2, Building2 } from "lucide-react";

// Carga todos los JSON por empresa en src/data/. Cada archivo debe ser un array de filas.
// Para agregar una empresa nueva: tirar un <slug>.json al directorio y reiniciar dev.
const dataModules = import.meta.glob("./data/*.json", { eager: true, import: "default" });
const RAW = Object.entries(dataModules)
  .filter(([path]) => !path.endsWith("/viajes.json"))
  .flatMap(([, mod]) => (Array.isArray(mod) ? mod : []))
  .filter(r => r && r.Empresa);

// === HELPERS ===
const fmt = (n) => {
  if (n == null || n === "" || isNaN(n)) return "—";
  return "$ " + Number(n).toLocaleString("es-AR");
};

const COMPANY_ACCENT = {
  "Flecha":          { bg: "bg-orange-100",   border: "border-orange-400",   text: "text-orange-900",   dot: "bg-orange-600",   ring: "ring-orange-300",   chip: "bg-orange-200" },
  "Super Tour":      { bg: "bg-red-100",      border: "border-red-400",      text: "text-red-900",      dot: "bg-red-600",      ring: "ring-red-300",      chip: "bg-red-200" },
  "Recrear":         { bg: "bg-green-100",    border: "border-green-500",    text: "text-green-900",    dot: "bg-green-600",    ring: "ring-green-300",    chip: "bg-green-200" },
  "Lake Travel":     { bg: "bg-blue-100",     border: "border-blue-500",     text: "text-blue-900",     dot: "bg-blue-600",     ring: "ring-blue-300",     chip: "bg-blue-200" },
  "Serrano":         { bg: "bg-fuchsia-100",  border: "border-fuchsia-400",  text: "text-fuchsia-900",  dot: "bg-fuchsia-600",  ring: "ring-fuchsia-300",  chip: "bg-fuchsia-200" },
  "Puerto Aventura": { bg: "bg-cyan-100",     border: "border-cyan-500",     text: "text-cyan-900",     dot: "bg-cyan-600",     ring: "ring-cyan-300",     chip: "bg-cyan-200" },
};

// Mapa explícito destino → provincia. Ante destinos nuevos: agregar acá o caen en "Otros".
const PROVINCIA_BY_DESTINO = {
  "Cariló": "Buenos Aires",
  "Chascomús": "Buenos Aires",
  "Dolores (Parque Termal)": "Buenos Aires",
  "Mar del Plata": "Buenos Aires",
  "San Clemente": "Buenos Aires",
  "San Pedro": "Buenos Aires",
  "Tandil": "Buenos Aires",
  "Carlos Paz / Córdoba": "Córdoba",
  "Carlos Paz / Córdoba (en Bus)": "Córdoba",
  "Córdoba": "Córdoba",
  "Villa Carlos Paz / Córdoba": "Córdoba",
  "Federación": "Entre Ríos",
};

const guessProvincia = (destino) => {
  if (PROVINCIA_BY_DESTINO[destino]) return PROVINCIA_BY_DESTINO[destino];
  if (/córdoba/i.test(destino)) return "Córdoba";
  return "Otros";
};

// Orden geográfico de norte a sur dentro del país, para que el listado se sienta natural.
// Las provincias no listadas caen al final por orden alfabético.
const PROVINCIA_ORDER = ["Buenos Aires", "Entre Ríos", "Córdoba"];

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
            <h3 className="font-serif text-xl text-stone-900 leading-tight">¿Cómo leer esta comparativa?</h3>
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
function DestinationCard({ empresa, destino, planes }) {
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

      {/* HEADER */}
      <div className={`${accent.bg} ${accent.border} border-b px-4 sm:px-6 pt-3.5 pb-3.5 sm:pt-5 sm:pb-5`}>
        <div className="flex items-center gap-2 mb-1 sm:mb-2">
          <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
          <p className={`text-[10.5px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.22em] font-bold ${accent.text}`}>{empresa}</p>
        </div>
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <h3 className="font-serif text-2xl sm:text-3xl text-stone-900 leading-tight tracking-tight flex items-start gap-1.5 sm:gap-2 min-w-0">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-stone-700 mt-0.5 sm:mt-1 shrink-0" strokeWidth={1.8} />
            <span className="break-words">{destino}</span>
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-white/90 backdrop-blur rounded-lg border border-stone-200 shrink-0">
            <TransIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-700" strokeWidth={2} />
            <span className="text-[12px] sm:text-sm font-semibold text-stone-700">{plan.Transporte}</span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-3.5 sm:pt-5 pb-2 space-y-3 sm:space-y-4">

        {/* SELECTOR DURACIÓN */}
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

        {/* SELECTOR / VISOR DE FORMA DE PAGO */}
        {availablePlans.length > 0 && (
          <div>
            <label className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Forma de pago</span>
              {availablePlans.length > 1 && (
                <span className="text-stone-400 font-normal">
                  {availablePlans.length} opciones disponibles
                </span>
              )}
            </label>
            {availablePlans.length === 1 ? (
              <div className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-[15px] font-semibold text-stone-900">
                {plan.Plan_Pago || "Plan único"}
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedPlanIdx}
                  onChange={(e) => setSelectedPlanIdx(Number(e.target.value))}
                  className="w-full appearance-none bg-white border-2 border-stone-300 rounded-xl pl-4 pr-10 py-3 text-[15px] font-semibold text-stone-900 focus:outline-none focus:border-stone-700 hover:border-stone-400 transition-colors cursor-pointer"
                >
                  {availablePlans.map((p, i) => (
                    <option key={i} value={i}>
                      {p.Plan_Pago}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        )}

        <HelpTip>{getPaymentTip(plan)}</HelpTip>
      </div>

      {/* CALCULADORA DE PAGOS */}
      <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 mb-2">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 text-white relative overflow-hidden">
          {isCheapest && (
            <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase rounded-full bg-emerald-500 text-white flex items-center gap-1 z-10">
              <CheckCircle2 className="w-3 h-3" />
              <Tooltip text={GLOSARIO.cheapest} label="Más económico" align="right" className="leading-none" />
            </span>
          )}

          {/* HERO: CUOTA MENSUAL */}
          {hasMonthlyPayments && (
            <div className="bg-white/[0.07] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-white/15 mb-2.5 sm:mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calculator className="w-3 h-3 text-emerald-300/80" strokeWidth={2.2} />
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-bold">
                  <Tooltip text={GLOSARIO.cuotaMensual} label="Pagás por mes" />
                </p>
              </div>
              <p className="font-serif text-3xl sm:text-5xl font-bold leading-none tracking-tight">{fmt(plan.Cuota_Mensual)}</p>
              <p className="text-[12px] sm:text-[13px] text-stone-300 mt-1.5 sm:mt-2 leading-snug">
                Durante <span className="font-bold text-white">{cuotasRestantes} {cuotasRestantes === 1 ? "mes" : "meses"}</span>
                {hasPrimeraCuotaDistinta ? " después de la primera" : ""}
                {ultimaCuotaLabel && (
                  <span className="text-stone-400">
                    {" · "}
                    <Tooltip text={GLOSARIO.ultimaCuota} label={<>última: <span className="font-bold text-white">{ultimaCuotaLabel}</span></>} />
                  </span>
                )}
              </p>
            </div>
          )}

          {!hasMonthlyPayments && plan.Cantidad_Cuotas === 1 && (
            <div className="bg-white/[0.07] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-white/15 mb-2.5 sm:mb-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-bold mb-1">
                <Tooltip text={GLOSARIO.contado} label="Pago único" />
              </p>
              <p className="font-serif text-2xl sm:text-4xl font-bold leading-none tracking-tight">{fmt(plan.Total_Final || upfront)}</p>
              <p className="text-[12px] sm:text-[13px] text-stone-300 mt-1.5 sm:mt-2">Todo en un solo pago al firmar</p>
            </div>
          )}

          {plan.Cantidad_Cuotas == null && (
            <div className="bg-white/[0.07] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-white/15 mb-2.5 sm:mb-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-bold mb-1">Plan a coordinar</p>
              <p className="text-[13px] sm:text-[14px] text-stone-200 mt-1 leading-snug">Las condiciones de pago se acuerdan directamente con la empresa</p>
            </div>
          )}

          {/* DETALLE DE PAGOS PREVIOS — compacto en una grilla */}
          {(upfront > 0 || hasAnticipo) && (
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
              {upfront > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
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
                  <p className="font-serif text-base sm:text-lg font-semibold leading-none shrink-0">{fmt(upfront)}</p>
                </div>
              )}
              {hasAnticipo && (
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                      <Tooltip text={GLOSARIO.anticipo} label="Anticipo antes del viaje" />
                    </p>
                    <p className="text-[10.5px] text-stone-500">aparte de las cuotas</p>
                  </div>
                  <p className="font-serif text-base sm:text-lg font-semibold leading-none shrink-0">{fmt(plan.Anticipo_Saldo)}</p>
                </div>
              )}
            </div>
          )}

          {/* TOTAL + CONTADO en una sola tira */}
          <div className="pt-2.5 sm:pt-3 border-t border-white/10 space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.14em] text-stone-400 font-semibold">
                <Tooltip text={GLOSARIO.totalFinal} label="Total del viaje" />
              </p>
              <p className="font-serif text-lg sm:text-xl font-semibold text-stone-200 leading-none">{fmt(plan.Total_Final)}</p>
            </div>
            {showContadoRef && (
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[10.5px] sm:text-[11px] text-stone-400">
                  <Tooltip text={GLOSARIO.contado} label="Si pagás de contado" />
                </p>
                <p className="font-serif text-sm sm:text-base font-semibold text-stone-300">{fmt(planContado.Total_Final)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DATOS DEL VIAJE — línea compacta */}
      {(plan.Dias || plan.Noches) && (
        <div className="px-4 sm:px-6 pt-2 pb-3 sm:pb-4 flex items-center gap-4 text-[12.5px] text-stone-600">
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
            className="w-full flex items-center justify-between py-3 sm:py-3.5 text-[13px] sm:text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
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
          className="w-full flex items-center justify-between py-3 sm:py-3.5 text-[13px] sm:text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
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
    </div>
  );
}

// === MAIN ===
export default function App() {

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Albert+Sans:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      .font-serif { font-family: 'Fraunces', Georgia, serif; }
      body, .font-sans { font-family: 'Albert Sans', system-ui, sans-serif; }
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

  const stats = useMemo(() => ({
    empresas: new Set(groupedDestinations.map(g => g.empresa)).size,
    destinos: groupedDestinations.length,
    planes: groupedDestinations.reduce((acc, g) => acc + g.planes.length, 0),
    provincias: groupedByProvincia.length,
  }), [groupedDestinations, groupedByProvincia]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 via-green-500 via-cyan-500 via-blue-500 to-fuchsia-500" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-12">

        {/* HEADER */}
        <div className="mb-5 sm:mb-8">
          <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] sm:tracking-[0.25em] text-stone-500 font-bold mb-1.5 sm:mb-2">Comparativa 2026</p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-stone-900 tracking-tight leading-none mb-2.5 sm:mb-4">
            Viajes de <em className="text-stone-700">egresados</em>
          </h1>
          <p className="text-stone-600 max-w-2xl text-[14px] sm:text-base leading-relaxed">
            Compará cuotas mensuales, formas de pago y duración. Tocá cualquier ícono <Info className="inline w-3.5 h-3.5 align-text-bottom" /> para ver una explicación en términos simples.
          </p>
        </div>

        <GuideBanner />


        {/* TABS DE ORDENAMIENTO */}
        <div className="mb-6 flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setTab("precio")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "precio"
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Por cuota
          </button>
          <button
            onClick={() => setTab("provincia")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "provincia"
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Por provincia
          </button>
          <button
            onClick={() => setTab("empresa")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "empresa"
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Por empresa
          </button>
        </div>

        {/* GRID — DEPENDE DEL TAB */}
        {tab === "precio" && (
          <div>
            <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-stone-300">
              <Wallet className="w-5 h-5 text-stone-700 shrink-0 self-center" strokeWidth={1.8} />
              <h2 className="font-serif text-3xl text-stone-900 tracking-tight">De menor a mayor cuota mensual</h2>
              <span className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-bold ml-auto">
                {sortedByPrice.length} tarjetas
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {sortedByPrice.map(g => (
                <DestinationCard
                  key={`${g.empresa}-${g.destino}-${g.transporte}`}
                  empresa={g.empresa}
                  destino={g.destino}
                  planes={g.planes}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "provincia" && (
          <div className="space-y-12">
            {groupedByProvincia.map(({ provincia, items }) => (
              <section key={provincia}>
                <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-stone-300">
                  <MapPin className="w-5 h-5 text-stone-700 shrink-0 self-center" strokeWidth={1.8} />
                  <h2 className="font-serif text-3xl text-stone-900 tracking-tight">{provincia}</h2>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-bold ml-auto">
                    {items.length} {items.length === 1 ? "tarjeta" : "tarjetas"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {items.map(g => (
                    <DestinationCard
                      key={`${g.empresa}-${g.destino}-${g.transporte}`}
                      empresa={g.empresa}
                      destino={g.destino}
                      planes={g.planes}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === "empresa" && (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {items.map(g => (
                      <DestinationCard
                        key={`${g.empresa}-${g.destino}-${g.transporte}`}
                        empresa={g.empresa}
                        destino={g.destino}
                        planes={g.planes}
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
