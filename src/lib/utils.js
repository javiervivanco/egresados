import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() — helper de shadcn para componer clases tailwind con merge.
// Resuelve conflictos (ej: "p-2 p-4" → "p-4") y permite arrays/objetos.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
