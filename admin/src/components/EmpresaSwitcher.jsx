import React from "react";
import { Select, Typography } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { useList } from "@refinedev/core";
import { useEmpresaContext } from "../contexts/EmpresaContext";

// Solo se monta para super_admin (ver Header). Permite "verse como" una empresa
// específica para CRUD-ear sus destinos/planes/ventas/etc. La RLS lo deja
// pasar igual (super_admin can do all), pero los filtros permanentes de las
// listas usan este empresaId.
export const EmpresaSwitcher = () => {
  const { empresaId, setEmpresaId } = useEmpresaContext();
  const { data } = useList({
    resource: "empresas",
    pagination: { mode: "off" },
    sorters: [{ field: "nombre", order: "asc" }],
  });

  return (
    <Select
      value={empresaId}
      onChange={setEmpresaId}
      style={{ width: 220 }}
      placeholder="Empresa"
      suffixIcon={<ShopOutlined />}
      options={(data?.data || []).map((e) => ({ label: e.nombre, value: e.id }))}
    />
  );
};
