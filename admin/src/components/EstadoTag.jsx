import React from "react";
import { Tag } from "antd";

// Mapping genérico: tomamos el color de la tabla pasada por prop y caemos
// a "default" si el estado no aparece.
export const EstadoTag = ({ estado, colorMap }) => {
  const color = colorMap?.[estado] || "default";
  return <Tag color={color}>{estado || "—"}</Tag>;
};
