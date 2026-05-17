import React, { useMemo, useState } from "react";
import { List, useTable, EditButton, ShowButton, DeleteButton } from "@refinedev/antd";
import { Table, Tag, Tooltip, Input, Select, Row, Col, Card, Statistic, Space } from "antd";
import { CheckCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { fmtFechaCorta } from "../../utils/formatters";
import { LEAD_ESTADOS, LEAD_ESTADO_COLOR, LEAD_ESTADO_LABEL } from "../../utils/leadEstados";

// Lista de leads con KPI de pipeline + filtros por estado y texto.
export const LeadsList = () => {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState();

  const { tableProps, setFilters, tableQuery } = useTable({
    resource: "leads",
    meta: { select: "*, escuelas(nombre), familias(id, apellido)" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { mode: "off" }, // queremos contar pipeline completo en stats
  });

  const allLeads = tableQuery?.data?.data || [];

  // Stats por estado
  const stats = useMemo(() => {
    const byEstado = Object.fromEntries(LEAD_ESTADOS.map((e) => [e.value, 0]));
    for (const l of allLeads) byEstado[l.estado] = (byEstado[l.estado] || 0) + 1;
    return byEstado;
  }, [allLeads]);

  // Filtrado client-side (sobre allLeads, no sobre tableProps.dataSource)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLeads.filter((l) => {
      if (estadoFilter && l.estado !== estadoFilter) return false;
      if (!q) return true;
      return [l.email, l.apellido, l.telefono, l.escuela_libre, l.escuelas?.nombre]
        .filter(Boolean).some((s) => s.toLowerCase().includes(q));
    });
  }, [allLeads, search, estadoFilter]);

  return (
    <List title="Pipeline de leads">
      {/* KPIs por estado */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {LEAD_ESTADOS.map((e) => (
          <Col key={e.value} xs={12} sm={8} md={Math.floor(24 / LEAD_ESTADOS.length)}>
            <Card
              size="small"
              hoverable
              onClick={() => setEstadoFilter(estadoFilter === e.value ? undefined : e.value)}
              style={{ cursor: "pointer", borderColor: estadoFilter === e.value ? "#2D5A27" : undefined }}
            >
              <Statistic
                title={<Tag color={e.color}>{e.label}</Tag>}
                value={stats[e.value] || 0}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filtros */}
      <Space style={{ marginBottom: 12 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Buscar por email, apellido, escuela…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 320 }}
        />
        <Select
          placeholder="Filtrar por estado"
          allowClear
          value={estadoFilter}
          onChange={setEstadoFilter}
          style={{ width: 180 }}
          options={LEAD_ESTADOS.map((e) => ({ label: e.label, value: e.value }))}
        />
      </Space>

      <Table dataSource={filtered} rowKey="id" pagination={{ pageSize: 20 }}>
        <Table.Column
          dataIndex="estado"
          title="Estado"
          width={120}
          render={(v) => <Tag color={LEAD_ESTADO_COLOR[v]}>{LEAD_ESTADO_LABEL[v] || v}</Tag>}
        />
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column dataIndex="apellido" title="Apellido" />
        <Table.Column dataIndex="telefono" title="Tel" />
        <Table.Column
          title="Escuela"
          render={(_, r) => {
            if (r.escuelas?.nombre) return <Tag color="green">{r.escuelas.nombre}</Tag>;
            if (r.escuela_libre) return (
              <Tooltip title="Escuela no está en el sistema — agregar manualmente">
                <Tag color="orange">{r.escuela_libre}</Tag>
              </Tooltip>
            );
            return <span style={{ color: "#999" }}>—</span>;
          }}
        />
        <Table.Column
          title="Grado/Año"
          render={(_, r) => {
            const partes = [r.grado_buscado, r.anio_egreso].filter(Boolean);
            return partes.length ? partes.join(" · ") : "—";
          }}
        />
        <Table.Column
          dataIndex="next_action_at"
          title="Próx. acción"
          render={(v, r) => v ? (
            <Tooltip title={r.next_action}>
              <span style={{ color: new Date(v) < new Date() ? "#E76F51" : "#264653" }}>
                {fmtFechaCorta(v)}
              </span>
            </Tooltip>
          ) : <span style={{ color: "#bbb" }}>—</span>}
        />
        <Table.Column
          dataIndex="created_at"
          title="Capturado"
          render={fmtFechaCorta}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={r.id} />
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
