import React from "react";
import { List, useTable, DeleteButton } from "@refinedev/antd";
import { useUpdate } from "@refinedev/core";
import { Table, Space, Button, Tag } from "antd";
import { EstadoTag } from "../../components/EstadoTag";
import { CORRECCION_COLOR } from "../../utils/estados";

export const CorreccionesList = () => {
  const { tableProps, tableQuery } = useTable({
    resource: "correcciones",
    meta: {
      select: "*, planes_viaje(plan_pago, destinos(nombre, empresas(nombre))), destinos(nombre, empresas(nombre))",
    },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });
  const { mutate: updateCorr } = useUpdate();
  const transition = (id, estado) =>
    updateCorr(
      { resource: "correcciones", id, values: { estado }, successNotification: { message: `Marcada como ${estado}`, type: "success" } },
      { onSuccess: () => tableQuery.refetch() },
    );

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="campo" title="Campo" />
        <Table.Column
          title="Cambio"
          render={(_, r) => (
            <Space>
              <Tag color="red">{r.valor_actual || "—"}</Tag>→<Tag color="green">{r.valor_correcto || "—"}</Tag>
            </Space>
          )}
        />
        <Table.Column
          title="Contexto"
          render={(_, r) => {
            const ctx = r.planes_viaje?.destinos || r.destinos;
            return `${ctx?.empresas?.nombre || "—"} · ${ctx?.nombre || "—"}${r.planes_viaje?.plan_pago ? ` · ${r.planes_viaje.plan_pago}` : ""}`;
          }}
        />
        <Table.Column dataIndex="comentario" title="Comentario" />
        <Table.Column
          dataIndex="estado"
          title="Estado"
          render={(v) => <EstadoTag estado={v} colorMap={CORRECCION_COLOR} />}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              {r.estado === "pendiente" && (
                <>
                  <Button size="small" type="primary" onClick={() => transition(r.id, "resuelta")}>Resolver</Button>
                  <Button size="small" onClick={() => transition(r.id, "descartada")}>Descartar</Button>
                </>
              )}
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
