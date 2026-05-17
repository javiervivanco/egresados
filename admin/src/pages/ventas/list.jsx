import React from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { useUpdate } from "@refinedev/core";
import { Table, Space, Button, Popconfirm } from "antd";
import { fmtARS } from "../../utils/formatters";
import { VENTA_ESTADO_COLOR } from "../../utils/estados";
import { EstadoTag } from "../../components/EstadoTag";

// Lista del lado empresa (filtrada por RLS). Para super, el dashboard
// (/ventas-dashboard) es la vista principal con KPIs.
export const VentasList = () => {
  const { tableProps, tableQuery } = useTable({
    resource: "ventas",
    meta: { select: "*, grupos(grado, anio_egreso, escuelas(nombre)), destinos(nombre), planes_viaje(plan_pago)" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const { mutate: updateVenta } = useUpdate();
  const transition = (id, estado) =>
    updateVenta(
      { resource: "ventas", id, values: { estado }, successNotification: { message: `Venta ${estado}`, type: "success" } },
      { onSuccess: () => tableQuery.refetch() },
    );

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Grupo"
          render={(_, r) => `${r.grupos?.escuelas?.nombre || "—"} · ${r.grupos?.grado || "—"}`}
        />
        <Table.Column title="Destino" render={(_, r) => r.destinos?.nombre || "—"} />
        <Table.Column title="Plan" render={(_, r) => r.planes_viaje?.plan_pago || "—"} />
        <Table.Column dataIndex="cantidad_pasajeros" title="Pasajeros" align="right" />
        <Table.Column dataIndex="monto_total" title="Total" align="right" render={fmtARS} />
        <Table.Column dataIndex="comision_monto" title="Comisión" align="right" render={fmtARS} />
        <Table.Column
          dataIndex="estado"
          title="Estado"
          render={(v) => <EstadoTag estado={v} colorMap={VENTA_ESTADO_COLOR} />}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space wrap>
              {r.estado === "borrador" && (
                <Popconfirm title="¿Confirmar venta?" onConfirm={() => transition(r.id, "confirmada")}>
                  <Button size="small" type="primary">Confirmar</Button>
                </Popconfirm>
              )}
              {r.estado === "confirmada" && (
                <Popconfirm title="¿Cancelar venta?" onConfirm={() => transition(r.id, "cancelada")}>
                  <Button size="small">Cancelar</Button>
                </Popconfirm>
              )}
              {r.estado === "borrador" && (
                <>
                  <EditButton hideText size="small" recordItemId={r.id} />
                  <DeleteButton hideText size="small" recordItemId={r.id} />
                </>
              )}
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
