import React from "react";
import { Navigate } from "react-router";
import { usePermissions } from "@refinedev/core";

// Index route: redirige al landing correcto según rol.
export const NavigateByRole = () => {
  const { data: perms, isLoading } = usePermissions({});
  if (isLoading) return null;
  if (perms?.rol === "super_admin") return <Navigate to="/ventas-dashboard" replace />;
  if (perms?.rol === "empresa_admin") return <Navigate to="/destinos" replace />;
  return <Navigate to="/login" replace />;
};
