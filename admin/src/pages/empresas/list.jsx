import React, { useEffect, useState } from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Tag, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { supabaseClient as supabase } from "../../lib/supabaseClient";

export const EmpresasList = () => {
  const { tableProps } = useTable({
    resource: "empresas",
    sorters: { initial: [{ field: "nombre", order: "asc" }] },
  });

  // Conteo de ciudades por empresa — una sola query.
  const [origenesPorEmpresa, setOrigenesPorEmpresa] = useState({});
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("empresas_origenes").select("empresa_id, ciudad_id")
      .then(({ data }) => {
        if (cancelled) return;
        const m = {};
        for (const r of (data || [])) m[r.empresa_id] = (m[r.empresa_id] || 0) + 1;
        setOrigenesPorEmpresa(m);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="nombre" title="Nombre" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column
          title="Ciudades"
          align="center"
          render={(_, r) => {
            const n = origenesPorEmpresa[r.id] || 0;
            if (n === 0) {
              return (
                <Tooltip title="Esta empresa no aparece en la comparativa porque no tiene ciudades de operación cargadas.">
                  <Tag color="warning" icon={<WarningOutlined />}>sin orígenes</Tag>
                </Tooltip>
              );
            }
            return <Tag color="blue">{n}</Tag>;
          }}
        />
        <Table.Column dataIndex="contacto_email" title="Email" />
        <Table.Column dataIndex="contacto_tel" title="Teléfono" />
        <Table.Column
          dataIndex="comision_pct_default"
          title="Comisión %"
          align="right"
          render={(v) => `${v ?? "—"}%`}
        />
        <Table.Column
          dataIndex="activo"
          title="Estado"
          render={(v) => <Tag color={v ? "green" : "default"}>{v ? "activa" : "inactiva"}</Tag>}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
