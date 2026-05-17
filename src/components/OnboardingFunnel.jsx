import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, GraduationCap, MapPin, CalendarClock, MessageSquare, Vote,
  ArrowRight, ArrowLeft, Check, Mail, Search,
} from "lucide-react";
import { saveIdentity } from "../lib/identity";
import { STATES } from "../lib/onboarding/machine";
import { useOnboarding } from "../lib/onboarding/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// FUNNEL DE ONBOARDING + LEAD CAPTURE
// Pasos: landing → contacto (lead!) → escuela → grupo → conversión.
// Validación zod por step, lead se persiste en cada paso.

const contactoSchema = z.object({
  email: z.string().min(1, "Email requerido").email("Email inválido"),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
});

const apellidoSchema = z.object({
  apellido: z.string().min(1, "Apellido requerido"),
});

const escuelaLibreSchema = z.object({
  escuela_libre: z.string().min(2, "Tipeá el nombre de tu escuela"),
  grado_libre: z.string().optional(),
  anio_egreso: z.coerce.number().int().min(2024).max(2050).optional(),
});

// Mapa STATE → step visible en el progress bar.
const STEP_OF = {
  [STATES.LANDING]:        0,
  [STATES.CONTACTO]:       1,
  [STATES.ESCUELA_BUSCAR]: 2,
  [STATES.ESCUELA_LIBRE]:  2,
  [STATES.GRUPO_ELEGIR]:   3,
  [STATES.GRUPO_CREAR]:    3,
  [STATES.APELLIDO]:       3,
  [STATES.SUBMITTING]:     3,
  [STATES.DONE]:           3,
};

export default function OnboardingFunnel({ onReady }) {
  const { state, ctx, escuelas, grupos, bootLoading, legacyMode, actions } = useOnboarding();
  const [escuelaSearch, setEscuelaSearch] = useState("");
  const [legacyNombre, setLegacyNombre] = useState("");

  // Al llegar a DONE persistimos identidad + notificamos al padre. Side-effect
  // del view, no de la FSM.
  useEffect(() => {
    if (state !== STATES.DONE) return;
    const nombre = `Familia ${ctx.apellido}`;
    saveIdentity({ nombre, familiaId: ctx.familiaId, grupoId: ctx.grupo?.id });
    onReady?.({ nombre, familiaId: ctx.familiaId, grupoId: ctx.grupo?.id });
  }, [state, ctx, onReady]);

  const escuelasFiltradas = useMemo(() => {
    const q = escuelaSearch.trim().toLowerCase();
    if (!q) return escuelas;
    return escuelas.filter((e) =>
      e.nombre.toLowerCase().includes(q) ||
      (e.localidad || "").toLowerCase().includes(q)
    );
  }, [escuelas, escuelaSearch]);

  const submitLegacy = () => {
    const v = legacyNombre.trim();
    if (!v) return;
    saveIdentity({ nombre: v });
    onReady({ nombre: v, familiaId: null, grupoId: null });
  };

  const step = STEP_OF[state] ?? 0;
  const submitting = state === STATES.SUBMITTING;
  const error = ctx.error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-background to-accent/10">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 via-green-500 via-cyan-500 via-blue-500 to-fuchsia-500" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <Header />
        {bootLoading ? (
          <CardShell><p className="text-muted-foreground text-sm text-center">Cargando…</p></CardShell>
        ) : legacyMode ? (
          <LegacyForm value={legacyNombre} onChange={setLegacyNombre} onSubmit={submitLegacy} />
        ) : state === STATES.LANDING ? (
          <Landing onStart={actions.start} />
        ) : (
          <CardShell>
            <Progress value={(step / 3) * 100} className="mb-6 h-1.5" />
            <Steps current={step} />
            {state === STATES.CONTACTO && (
              <ContactoStep
                defaultValues={ctx.contacto}
                error={error}
                onSubmit={actions.submitContacto}
                onBack={actions.back}
              />
            )}
            {(state === STATES.ESCUELA_BUSCAR || state === STATES.ESCUELA_LIBRE) && (
              <EscuelaStep
                mode={state === STATES.ESCUELA_LIBRE ? "libre" : "buscar"}
                escuelas={escuelasFiltradas}
                search={escuelaSearch} setSearch={setEscuelaSearch}
                onPick={actions.pickEscuela}
                onColdLead={actions.submitColdEscuela}
                onSwitchToLibre={actions.toLibre}
                onSwitchToBuscar={actions.toBuscar}
                onBack={actions.back}
              />
            )}
            {(state === STATES.GRUPO_ELEGIR || state === STATES.GRUPO_CREAR ||
              state === STATES.APELLIDO || state === STATES.SUBMITTING) && ctx.escuela && (
              <GrupoStep
                state={state}
                escuela={ctx.escuela} grupos={grupos.length ? grupos : ctx.grupos}
                grupo={ctx.grupo}
                defaultApellido={ctx.contacto.apellido}
                submitting={submitting} error={error}
                onPickGrupo={actions.pickGrupo}
                onCreateGrupo={actions.submitGrupoCrear}
                onFinish={actions.submitApellido}
                onBack={actions.back}
              />
            )}
          </CardShell>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Layout helpers
// ============================================================
function Header() {
  return (
    <div className="text-center mb-8 sm:mb-12">
      <Badge variant="outline" className="bg-card text-primary border-primary/30 uppercase tracking-[0.25em] mb-3">Comparativa 2026</Badge>
      <h1 className="font-sans italic text-3xl sm:text-5xl lg:text-6xl text-foreground tracking-tight leading-tight mb-3 sm:mb-4">
        Viajes de <em className="text-primary">egresados</em>
      </h1>
      <p className="text-muted-foreground max-w-2xl mx-auto text-[15px] sm:text-base leading-relaxed">
        Compará las propuestas de todas las empresas para tu viaje de fin de curso. Cuotas, fechas, actividades — todo en un solo lugar, sin presión comercial.
      </p>
    </div>
  );
}

function CardShell({ children }) {
  return (
    <Card className="max-w-md mx-auto shadow-lg">
      <CardContent className="p-6 sm:p-8">{children}</CardContent>
    </Card>
  );
}

function Steps({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
            n < current ? "bg-primary text-primary-foreground" :
            n === current ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2" :
            "bg-muted text-muted-foreground"
          }`}>
            {n < current ? <Check className="w-4 h-4" /> : n}
          </div>
          {n < 3 && <div className={`w-8 h-0.5 transition-all ${n < current ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center mb-5">
      <div className="w-14 h-14 rounded-full bg-secondary/30 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <CardTitle className="font-sans italic text-2xl text-foreground mb-1">{title}</CardTitle>
      <CardDescription>{subtitle}</CardDescription>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <Button variant="link" size="sm" onClick={onClick} className="mt-4 mx-auto block text-muted-foreground hover:text-foreground">
      <ArrowLeft className="w-3 h-3" /> volver
    </Button>
  );
}

// ============================================================
// Landing
// ============================================================
function Landing({ onStart }) {
  const features = [
    { icon: MapPin, title: "Todos los destinos", desc: "Bariloche, Carlos Paz, costa atlántica, termas — con precios actualizados." },
    { icon: Vote, title: "Votación grupal", desc: "Las familias del grado deciden juntas qué propuesta les conviene." },
    { icon: CalendarClock, title: "Reuniones coordinadas", desc: "Las empresas proponen fechas para presentar su propuesta al grupo." },
    { icon: MessageSquare, title: "Chat directo", desc: "Comunicación con cada empresa sin intermediarios." },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-sans italic text-xl sm:text-2xl text-foreground text-center mb-6">¿Cómo funciona?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-4 sm:p-5 flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-[15px] mb-0.5">{title}</h3>
                  <p className="text-muted-foreground text-[13.5px] leading-relaxed">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="shadow-lg">
        <CardContent className="p-6 sm:p-8 text-center">
          <CardTitle className="font-sans italic text-xl sm:text-2xl mb-2">Empezá registrándote</CardTitle>
          <CardDescription className="mb-5 max-w-md mx-auto">
            Te pedimos tu mail y elegís tu escuela. Si todavía no la cargamos, te avisamos cuando esté lista.
          </CardDescription>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5 flex-wrap">
            <StepPreview n={1} label="Tu mail" />
            <ArrowRight className="w-3 h-3 opacity-50" />
            <StepPreview n={2} label="Tu escuela" />
            <ArrowRight className="w-3 h-3 opacity-50" />
            <StepPreview n={3} label="Tu grado" />
          </div>
          <Button size="lg" onClick={onStart} className="font-bold">
            Empezar <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StepPreview({ n, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full bg-secondary/40 text-primary font-bold text-[10px] flex items-center justify-center">{n}</span>
      {label}
    </span>
  );
}

// ============================================================
// Step 1: Contacto (email + apellido + tel)
// ============================================================
function ContactoStep({ defaultValues, error, onSubmit, onBack }) {
  const form = useForm({
    resolver: zodResolver(contactoSchema),
    defaultValues,
  });

  return (
    <>
      <StepHeader icon={Mail} title="Tu contacto" subtitle="Para avisarte de novedades sobre los viajes." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control} name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="email" placeholder="Email" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control} name="apellido"
            render={({ field }) => (
              <FormItem>
                <FormControl><Input placeholder="Apellido (opcional)" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control} name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormControl><Input type="tel" placeholder="Teléfono (opcional)" {...field} /></FormControl>
              </FormItem>
            )}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full font-bold" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando…" : <>Continuar <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>
      </Form>
      <BackBtn onClick={onBack} />
    </>
  );
}

// ============================================================
// Step 2: Escuela
// ============================================================
function EscuelaStep({ mode = "buscar", escuelas, search, setSearch,
                       onPick, onColdLead,
                       onSwitchToLibre, onSwitchToBuscar, onBack }) {
  const form = useForm({
    resolver: zodResolver(escuelaLibreSchema),
    defaultValues: { escuela_libre: "", grado_libre: "", anio_egreso: new Date().getFullYear() + 1 },
  });

  return (
    <>
      <StepHeader icon={GraduationCap} title="Tu escuela" subtitle="Elegí tu colegio o avisanos si no está en la lista." />
      {mode === "buscar" ? (
        <>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o localidad…"
              className="pl-9"
            />
          </div>
          {escuelas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin resultados. Probá <Button variant="link" className="px-1 h-auto" onClick={onSwitchToLibre}>tipear tu escuela</Button>.
            </p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {escuelas.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => onPick(e)}
                    className="w-full text-left bg-muted hover:bg-secondary/30 border rounded-xl px-4 py-3 transition-colors"
                  >
                    <p className="font-semibold text-foreground">{e.nombre}</p>
                    {e.localidad && <p className="text-xs text-muted-foreground">{e.localidad}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="link" size="sm" onClick={onSwitchToLibre} className="mt-4 mx-auto block text-muted-foreground hover:text-foreground">
            ¿No está tu escuela?
          </Button>
        </>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onColdLead)} className="space-y-3">
            <p className="text-[13px] text-foreground bg-accent/15 border border-accent/40 rounded-lg px-3 py-2">
              No la encontramos. Tipeala y la sumamos automáticamente para que puedas seguir.
            </p>
            <FormField
              control={form.control} name="escuela_libre"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Nombre de la escuela" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control} name="grado_libre"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Grado (Ej: 6to A)" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="anio_egreso"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input type="number" placeholder="Año egreso" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full font-bold" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando…" : <>Continuar <ArrowRight className="w-4 h-4" /></>}
            </Button>
            <Button variant="link" size="sm" type="button" onClick={onSwitchToBuscar} className="mx-auto block text-muted-foreground hover:text-foreground">
              ← volver a buscar
            </Button>
          </form>
        </Form>
      )}
      <BackBtn onClick={onBack} />
    </>
  );
}

// ============================================================
// Step 3: Grupo + apellido
// ============================================================
function GrupoStep({ state, escuela, grupos, grupo, defaultApellido, submitting, error,
                     onPickGrupo, onCreateGrupo, onFinish, onBack }) {
  const form = useForm({
    resolver: zodResolver(apellidoSchema),
    defaultValues: { apellido: defaultApellido || "" },
  });
  const grupoForm = useForm({
    defaultValues: { grado: "", anio_egreso: new Date().getFullYear() + 1 },
  });

  const showGrupoPicker = state === STATES.GRUPO_ELEGIR || state === STATES.GRUPO_CREAR;
  if (showGrupoPicker) {
    return (
      <>
        <StepHeader icon={Users} title="¿Qué grado?" subtitle={escuela.nombre} />
        {state === STATES.GRUPO_CREAR || grupos.length === 0 ? (
          <Form {...grupoForm}>
            <form onSubmit={grupoForm.handleSubmit(onCreateGrupo)} className="space-y-3">
              <p className="text-[13px] text-foreground bg-accent/15 border border-accent/40 rounded-lg px-3 py-2">
                No hay grados cargados para esta escuela. Decinos el tuyo y lo agregamos al toque.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={grupoForm.control} name="grado"
                  render={({ field }) => (
                    <FormItem><FormControl><Input placeholder="Grado (Ej: 6to A)" autoFocus {...field} /></FormControl></FormItem>
                  )}
                />
                <FormField
                  control={grupoForm.control} name="anio_egreso"
                  render={({ field }) => (
                    <FormItem><FormControl><Input type="number" placeholder="Año egreso" {...field} /></FormControl></FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full font-bold" disabled={grupoForm.formState.isSubmitting}>
                {grupoForm.formState.isSubmitting ? "Guardando…" : <>Continuar <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
          </Form>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-auto">
            {grupos.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => onPickGrupo(g)}
                  className="w-full text-left bg-muted hover:bg-secondary/30 border rounded-xl px-4 py-3 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-foreground">{g.grado || "—"}</span>
                  <span className="text-xs text-muted-foreground">Egreso {g.anio_egreso}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <BackBtn onClick={onBack} />
      </>
    );
  }

  return (
    <>
      <StepHeader icon={Users} title="Confirmá tu apellido" subtitle={`${escuela.nombre} · ${grupo.grado || ""} (egreso ${grupo.anio_egreso})`} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFinish)} className="space-y-3">
          <FormField
            control={form.control} name="apellido"
            render={({ field }) => (
              <FormItem>
                <FormControl><Input placeholder="Apellido" autoFocus {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full font-bold" disabled={submitting}>
            {submitting ? "Guardando…" : <>Empezar a comparar <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>
      </Form>
      <BackBtn onClick={onBack} />
    </>
  );
}

// ============================================================
// Legacy (sin DB)
// ============================================================
function LegacyForm({ value, onChange, onSubmit }) {
  return (
    <CardShell>
      <StepHeader icon={Users} title="¡Hola!" subtitle="¿De qué familia o alumno/a estamos viendo viajes?" />
      <div className="space-y-3">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Ej: Familia García"
          autoFocus
        />
        <Button onClick={onSubmit} disabled={!value.trim()} className="w-full font-bold">
          Empezar a comparar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </CardShell>
  );
}
