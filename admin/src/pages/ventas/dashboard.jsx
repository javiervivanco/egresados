import React, { useMemo, useState } from "react";
import { List } from "@refinedev/antd";
import { useList, useUpdate } from "@refinedev/core";
import { Row, Col, Card, Statistic, Table, Button, Select, Popconfirm } from "antd";
import { DollarOutlined, RiseOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { fmtARS } from "../../utils/formatters";
import { VENTA_ESTADO_COLOR } from "../../utils/estados";
import { EstadoTag } from "../../components/EstadoTag";

const ESTADOS_QUE_CUENTAN = ["confirmada", "pagada", "liquidada"];
const ESTADOS_COBRADOS = ["pagada", "liquidada"];

// Dashboard de super_admin con KPIs, agregado por empresa y detalle con
// transiciones que solo super puede hacer (pagada, liquidada).
export const VentasDashboard = () => {
  const [filtroEstado, setFiltroEstado] = useState();

  const { data: ventasData, refetch } = useList({
    resource: "ventas",
    meta: { select: "*, empresas(nombre), grupos(grado, anio_egreso, escuelas(nombre))" },
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const ventas = ventasData?.data || [];

  const stats = useMemo(() => {
    const cuentan = (v) => ESTADOS_QUE_CUENTAN.includes(v.estado);
    const total = ventas.filter(cuentan).reduce((s, v) => s + (v.monto_total || 0), 0);
    const comisionTotal = ventas.filter(cuentan).reduce((s, v) => s + (v.comision_monto || 0), 0);
    const cobrada = ventas.filter((v) => ESTADOS_COBRADOS.includes(v.estado)).reduce((s, v) => s + (v.comision_monto || 0), 0);
    const pendiente = comisionTotal - cobrada;

    const porEmpresa = new Map();
    for (const v of ventas) {
      if (!cuentan(v)) continue;
      const k = v.empresas?.nombre || `Empresa ${v.empresa_id}`;
      const e = porEmpresa.get(k) || { nombre: k, monto: 0, comision: 0, ventas: 0 };
      e.monto += v.monto_total || 0;
      e.comision += v.comision_monto || 0;
      e.ventas += 1;
      porEmpresa.set(k, e);
    }
    return { total, comisionTotal, cobrada, pendiente, porEmpresa: [...porEmpresa.values()].sort((a, b) => b.comision - a.comision) };
  }, [ventas]);

  const { mutate: updateVenta } = useUpdate();
  const transition = (id, estado) =>
    updateVenta({ resource: "ventas", id, values: { estado } }, { onSuccess: () => refetch() });

  const ventasFiltradas = filtroEstado ? ventas.filter((v) => v.estado === filtroEstado) : ventas;

  return (
    <List title="Comisiones (super)" headerButtons={[]}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card><Statistic title="Ventas confirmadas" value={fmtARS(stats.total)} prefix={<DollarOutlined />} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Comisión generada" value={fmtARS(stats.comisionTotal)} prefix={<RiseOutlined />} valueStyle={{ color: "#E76F51" }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Comisión cobrada" value={fmtARS(stats.cobrada)} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#2D5A27" }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Pendiente de cobro" value={fmtARS(stats.pendiente)} prefix={<ClockCircleOutlined />} valueStyle={{ color: "#264653" }} /></Card>
        </Col>
      </Row>

      <Card title="Comisión por empresa" style={{ marginBottom: 16 }}>
        {stats.porEmpresa.length === 0 ? (
          <p style={{ color: "#999" }}>Sin ventas confirmadas.</p>
        ) : (
          <Table dataSource={stats.porEmpresa} rowKey="nombre" pagination={false} size="small">
            <Table.Column dataIndex="nombre" title="Empresa" />
            <Table.Column dataIndex="ventas" title="Ventas" align="right" />
            <Table.Column dataIndex="monto" title="Monto" align="right" render={fmtARS} />
            <Table.Column
              dataIndex="comision"
              title="Comisión"
              align="right"
              render={(v) => <strong style={{ color: "#E76F51" }}>{fmtARS(v)}</strong>}
            />
          </Table>
        )}
      </Card>

      <Card
        title="Detalle de ventas"
        extra={
          <Select
            placeholder="Filtrar por estado"
            allowClear
            style={{ width: 200 }}
            value={filtroEstado}
            onChange={setFiltroEstado}
            options={["borrador", "confirmada", "pagada", "liquidada", "cancelada"].map((v) => ({ label: v, value: v }))}
          />
        }
      >
        <Table dataSource={ventasFiltradas} rowKey="id" size="small">
          <Table.Column
            title="Empresa / Grupo"
            render={(_, v) => `${v.empresas?.nombre || "—"} → ${v.grupos?.escuelas?.nombre || "—"} · ${v.grupos?.grado || "—"}`}
          />
          <Table.Column dataIndex="cantidad_pasajeros" title="Pasajeros" align="right" />
          <Table.Column dataIndex="monto_total" title="Total" align="right" render={fmtARS} />
          <Table.Column dataIndex="comision_monto" title="Comisión" align="right" render={fmtARS} />
          <Table.Column dataIndex="estado" title="Estado" render={(v) => <EstadoTag estado={v} colorMap={VENTA_ESTADO_COLOR} />} />
          <Table.Column
            title="Acciones"
            render={(_, v) => (
              <>
                {v.estado === "confirmada" && (
                  <Popconfirm title="¿Marcar como pagada?" onConfirm={() => transition(v.id, "pagada")}>
                    <Button size="small">Marcar pagada</Button>
                  </Popconfirm>
                )}
                {v.estado === "pagada" && (
                  <Popconfirm title="¿Liquidar venta?" onConfirm={() => transition(v.id, "liquidada")}>
                    <Button size="small" type="primary">Liquidar</Button>
                  </Popconfirm>
                )}
              </>
            )}
          />
        </Table>
      </Card>
    </List>
  );
};
