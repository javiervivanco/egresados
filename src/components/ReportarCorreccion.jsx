import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageCircleWarning } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Modal para reportar errores en los datos de un plan/destino. Solo se
// renderiza cuando el plan vino de DB (tiene FK válida).
const schema = z.object({
  campo:           z.string().min(1, "Indicá qué campo está mal."),
  valor_actual:    z.string().optional(),
  valor_correcto:  z.string().optional(),
  comentario:      z.string().optional(),
});

export default function ReportarCorreccion({ planId, destinoId, empresaNombre, destinoNombre, planNombre }) {
  const [open, setOpen] = useState(false);

  if (!planId && !destinoId) return null;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { campo: "", valor_actual: "", valor_correcto: "", comentario: "" },
  });

  const onSubmit = async (values) => {
    const { error } = await supabase.from("correcciones").insert({
      plan_id: planId || null,
      destino_id: destinoId || null,
      campo: values.campo.trim(),
      valor_actual: values.valor_actual?.trim() || null,
      valor_correcto: values.valor_correcto?.trim() || null,
      comentario: values.comentario?.trim() || null,
    });
    if (error) { toast.error("No pudimos enviar el reporte", { description: error.message }); return; }
    toast.success("¡Gracias! Reporte enviado.");
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 ml-auto">
          <MessageCircleWarning className="w-3 h-3" /> Reportar error
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Hay un dato mal cargado?</DialogTitle>
          <DialogDescription>
            {empresaNombre}{destinoNombre && <> · {destinoNombre}</>}{planNombre && <> · {planNombre}</>}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="campo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: cuota mensual, total final" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="valor_actual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor mostrado</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_correcto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor correcto</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="comentario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario (opcional)</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enviando…" : "Enviar reporte"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
