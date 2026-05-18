import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, GraduationCap, MapPin, CalendarClock, MessageSquare, Vote,
  ArrowRight, ArrowLeft, Check, Mail, Search, Copy, Share2,
} from "lucide-react";
import { supabase } from "../supabase";
import { saveIdentity } from "../lib/identity";
import { STATES } from "../lib/onboarding/machine";
import { useOnboarding } from "../lib/onboarding/useOnboarding";
import { loadTeaser } from "../lib/teaser";
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
  telefono: z.string()
    .min(8, "Necesitamos tu teléfono para coordinar con tu grupo")
    .regex(/^[0-9+\s\-()]{8,}$/, "Teléfono inválido"),
});

const apellidoSchema = z.object({
  apellido: z.string().min(1, "Apellido requerido"),
});

const escuelaLibreSchema = z.object({
  escuela_libre: z.string().min(2, "Tipeá el nombre de tu escuela"),
  ciudad_id: z.coerce.number().int().min(1, "Elegí la ciudad"),
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

export default function OnboardingFunnel({ onReady, invitacionToken = null }) {
  const { state, ctx, escuelas, ciudades, grupos, bootLoading, legacyMode, actions } =
    useOnboarding({ invitacionToken });
  const [escuelaSearch, setEscuelaSearch] = useState("");
  const [legacyNombre, setLegacyNombre] = useState("");
  const [invitacionVista, setInvitacionVista] = useState(false);

  // Al llegar a DONE persistimos identidad PERO no avisamos al padre todavía.
  // Mostramos primero la pantalla de invitación. onReady se llama cuando la
  // familia cierra esa pantalla (o decide saltarla).
  useEffect(() => {
    if (state !== STATES.DONE) return;
    const nombre = `Familia ${ctx.apellido}`;
    const ciudadId = ctx.escuela?.ciudad_id || ctx.escuela?.ciudades?.id || null;
    saveIdentity({ nombre, familiaId: ctx.familiaId, grupoId: ctx.grupo?.id, ciudadId });
  }, [state, ctx]);

  useEffect(() => {
    if (state !== STATES.DONE || !invitacionVista) return;
    const nombre = `Familia ${ctx.apellido}`;
    const ciudadId = ctx.escuela?.ciudad_id || ctx.escuela?.ciudades?.id || null;
    onReady?.({ nombre, familiaId: ctx.familiaId, grupoId: ctx.grupo?.id, ciudadId });
  }, [state, invitacionVista, ctx, onReady]);

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
                ciudades={ciudades}
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
            {state === STATES.DONE && ctx.grupo && (
              <InvitacionStep
                grupoId={ctx.grupo.id}
                escuelaNombre={ctx.escuela?.nombre || ""}
                grado={ctx.grupo?.grado || ""}
                apellido={ctx.apellido}
                esNuevaFamilia={!!ctx.esNuevaFamilia}
                onContinue={() => setInvitacionVista(true)}
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
  // Gancho de marketing: ver destinos SIN precio antes de registrarse.
  // El usuario explora libremente; el precio queda detrás del onboarding.
  const [destinos, setDestinos] = useState([]);
  useEffect(() => {
    let cancelled = false;
    loadTeaser().then((d) => { if (!cancelled) setDestinos(d); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-sans italic text-xl sm:text-2xl text-foreground text-center mb-2">
          Mirá las opciones disponibles
        </h2>
        <p className="text-muted-foreground text-sm text-center mb-6 max-w-2xl mx-auto">
          Estos son los destinos a los que viajan los grupos de egresados. <strong>Los precios y cuotas se desbloquean cuando completás tu registro</strong> — así sabés qué propuesta te conviene a vos y a tu grupo.
        </p>
        {destinos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {destinos.slice(0, 12).map((d) => (
              <Card key={d.nombre} className="overflow-hidden">
                <CardContent className="p-3 text-center">
                  <p className="font-bold text-foreground text-[14px] leading-tight mb-1">{d.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.empresas} {d.empresas === 1 ? "empresa" : "empresas"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center mb-6">Cargando destinos…</p>
        )}
      </section>

      <Card className="shadow-lg border-primary/30">
        <CardContent className="p-6 sm:p-8 text-center">
          <CardTitle className="font-sans italic text-xl sm:text-2xl mb-2">Desbloqueá los precios</CardTitle>
          <CardDescription className="mb-5 max-w-md mx-auto">
            Mail + teléfono + tu escuela: tres pasos para ver cuotas reales y empezar a comparar con tu grupo.
          </CardDescription>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5 flex-wrap">
            <StepPreview n={1} label="Tu contacto" />
            <ArrowRight className="w-3 h-3 opacity-50" />
            <StepPreview n={2} label="Tu escuela" />
            <ArrowRight className="w-3 h-3 opacity-50" />
            <StepPreview n={3} label="Tu grado" />
          </div>
          <Button size="lg" onClick={onStart} className="font-bold">
            Ver los precios <ArrowRight className="w-4 h-4" />
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
                <FormControl>
                  <Input type="tel" placeholder="Teléfono (ej. +54 9 11 1234-5678)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-[11.5px] text-muted-foreground -mt-1">
            Lo usamos para coordinar por WhatsApp con tu grupo (sin spam ni reventa).
          </p>
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
function EscuelaStep({ mode = "buscar", escuelas, ciudades = [], search, setSearch,
                       onPick, onColdLead,
                       onSwitchToLibre, onSwitchToBuscar, onBack }) {
  const form = useForm({
    resolver: zodResolver(escuelaLibreSchema),
    defaultValues: { escuela_libre: "", ciudad_id: "", grado_libre: "", anio_egreso: new Date().getFullYear() + 1 },
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
            <FormField
              control={form.control} name="ciudad_id"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <select {...field}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                      <option value="">Ciudad de tu escuela…</option>
                      {ciudades.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}{c.provincia ? ` · ${c.provincia}` : ""}</option>
                      ))}
                    </select>
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
// Invitación: post-DONE. Pantalla viral: la primera familia comparte
// el link de su grupo. Token vive 90 días y rota en `grupos`.
// ============================================================
function InvitacionStep({ grupoId, escuelaNombre, grado, apellido, esNuevaFamilia = true, onContinue }) {
  const [token, setToken] = useState(null);
  const [miembros, setMiembros] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!grupoId || !supabase) return;
    let cancelled = false;
    supabase.from("grupos")
      .select("invitacion_token, invitacion_expira_at")
      .eq("id", grupoId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setToken(data?.invitacion_token || null); });
    return () => { cancelled = true; };
  }, [grupoId]);

  // Cuántos miembros tiene mi familia ahora (yo + cualquiera previo).
  useEffect(() => {
    if (esNuevaFamilia || !supabase || !apellido || !grupoId) return;
    let cancelled = false;
    supabase.rpc("familia_lookup", { p_grupo_id: grupoId, p_apellido: apellido })
      .then(({ data }) => { if (!cancelled) setMiembros(data?.miembros ?? null); });
    return () => { cancelled = true; };
  }, [esNuevaFamilia, grupoId, apellido]);

  const url = token ? `${window.location.origin}/?inv=${token}` : "";
  const mensaje = `¡Hola! Me sumé a la plataforma para comparar viajes de egresados de ${escuelaNombre}${grado ? ` (${grado})` : ""}. Sumate y elegimos juntos: ${url}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {/* clipboard puede fallar en http; el link es visible igual */}
  };

  return (
    <>
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-primary-foreground" />
        </div>
        <CardTitle className="font-sans italic text-2xl mb-1">
          {esNuevaFamilia ? "¡Listo, ya estás dentro!" : `Te sumaste a Familia ${apellido}`}
        </CardTitle>
        <CardDescription>
          {esNuevaFamilia
            ? "Sumá a las otras familias de tu grado para comparar precios juntos."
            : miembros && miembros > 1
              ? `Ya hay ${miembros} personas registradas en tu familia. Las votaciones se cuentan como un voto colectivo de Familia ${apellido}.`
              : "Tu registro queda asociado a tu familia. Compartí con otras familias del grado."}
        </CardDescription>
      </div>

      <div className="bg-accent/10 border border-accent/40 rounded-lg p-3 mb-3">
        <p className="text-[13px] text-foreground mb-2">
          <strong>Compartí este link con tu grupo.</strong> Cuando entren, ya tienen tu escuela y grado preseleccionados.
        </p>
        <div className="flex items-center gap-2 bg-card border rounded-md px-2 py-1.5">
          <code className="text-[12px] text-muted-foreground flex-1 truncate">{url || "Generando link…"}</code>
          <Button size="sm" variant="outline" onClick={copiar} disabled={!url}>
            <Copy className="w-3.5 h-3.5" />
            {copiado ? "¡copiado!" : ""}
          </Button>
        </div>
      </div>

      <a href={url ? waUrl : "#"} target="_blank" rel="noopener noreferrer" className="block">
        <Button className="w-full font-bold bg-[#25D366] hover:bg-[#1da851] text-white" disabled={!url}>
          <Share2 className="w-4 h-4" />
          Compartir por WhatsApp
        </Button>
      </a>

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Más familias = más opciones de descuento grupal. El link vale 90 días.
      </p>

      <Button variant="link" className="w-full mt-3 text-muted-foreground" onClick={onContinue}>
        Más tarde — ir a comparar destinos →
      </Button>
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
