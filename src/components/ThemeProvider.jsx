import { useEffect } from "react";
import { resolveTheme, applyTheme } from "@/lib/theme";

// Provider declarativo que aplica el theme al `<html data-theme="...">`.
// No expone Context — el theming es 100% CSS, no necesita propagarse en React.
//
// Escucha cambios del query string (popstate) por si marketing comparte links
// con `?theme=ocean` y la app hace navigation interna en algún momento.
export default function ThemeProvider({ children }) {
  useEffect(() => {
    applyTheme(resolveTheme());

    const onPop = () => applyTheme(resolveTheme());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return children;
}
