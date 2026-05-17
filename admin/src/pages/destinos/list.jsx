import React from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { useUpdate } from "@refinedev/core";
import { Table, Space, Tag, Tabs, Button } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { useEmpresaContext } from "../../contexts/EmpresaContext";
import { PlanesNested } from "./PlanesNested";
import { DocumentosNested } from "./DocumentosNested";

// Destinos con planes + documentos anidados (expandable + Tabs).
export const DestinosList = () => {
  const { empresaId } = useEmpresaContext();
  const { tableProps, tableQuery } = useTable({
    resource: "destinos",
    meta: {
      select: "*, planes_viaje(id, plan_pago, total_final, transporte, dias, noches, cuota_mensual), documentos(id, nombre, procesado_estado, storage_path)",
    },
    filters: {
      permanent: empresaId ? [{ field: "empresa_id", operator: "eq", value: empresaId }] : [],
    },
    queryOptions: { enabled: !!empresaId },
    sorters: { initial: [{ field: "nombre", order: "asc" }] },
  });

  const { mutate: updateDestino } = useUpdate();
  const toggleActivo = (d) => {
    updateDestino(
      { resource: "destinos", id: d.id, values: { activo: !d.activo }, successNotification: false },
      { onSuccess: () => tableQuery.refetch() },
    );
  };

  return (
    <List>
      <Table
        {...tableProps}
        rowKey="id"
        expandable={{
          expandedRowRender: (d) => (
            <Tabs
              size="small"
              items={[
                {
                  key: "planes",
                  label: `Planes (${d.planes_viaje?.length || 0})`,
                  children: <PlanesNested destinoId={d.id} planes={d.planes_viaje || []} onChange={() => tableQuery.refetch()} />,
                },
                {
                  key: "documentos",
                  label: `Documentos (${d.documentos?.length || 0})`,
                  children: <DocumentosNested destinoId={d.id} documentos={d.documentos || []} onChange={() => tableQuery.refetch()} />,
                },
              ]}
            />
          ),
        }}
      >
        <Table.Column dataIndex="nombre" title="Destino" />
        <Table.Column dataIndex="provincia" title="Provincia" />
        <Table.Column
          dataIndex="activo"
          title="Estado"
          render={(v) => <Tag color={v ? "green" : "default"}>{v ? "activo" : "inactivo"}</Tag>}
        />
        <Table.Column
          title="Planes"
          align="right"
          render={(_, r) => r.planes_viaje?.length || 0}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              <Button
                size="small"
                icon={r.activo ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={() => toggleActivo(r)}
                title={r.activo ? "Desactivar" : "Activar"}
              />
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
