import React, { createContext, useContext, useEffect, useState } from "react";
import { usePermissions } from "@refinedev/core";
import { supabaseClient } from "../lib/supabaseClient";

// Contexto para la "empresa contextual" del super_admin. Para empresa_admin
// es siempre su propia empresa (fixed). Para super_admin se elige via el
// <EmpresaSwitcher> en el header — por default es la primera empresa.

const EmpresaContext = createContext({ empresaId: null, setEmpresaId: () => {} });

export function EmpresaContextProvider({ children }) {
  const { data: perms } = usePermissions({});
  const [empresaId, setEmpresaId] = useState(null);

  useEffect(() => {
    if (!perms) return;
    if (perms.rol === "empresa_admin") {
      setEmpresaId(perms.empresa_id);
    } else if (perms.rol === "super_admin" && empresaId === null) {
      supabaseClient
        .from("empresas").select("id").order("nombre").limit(1)
        .then(({ data }) => data?.[0] && setEmpresaId(data[0].id));
    }
  }, [perms, empresaId]);

  return (
    <EmpresaContext.Provider value={{ empresaId, setEmpresaId }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export const useEmpresaContext = () => useContext(EmpresaContext);
