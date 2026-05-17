// Helpers de formato. Todos en es-AR.

export const fmtARS = (n) => {
  if (n == null || n === "" || isNaN(n)) return "—";
  return "$ " + Number(n).toLocaleString("es-AR");
};

export const fmtFechaCorta = (s) => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
};

export const fmtFechaHora = (s) => {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
};
