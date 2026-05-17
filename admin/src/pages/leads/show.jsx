import React, { useState } from "react";
import { Show, EditButton } from "@refinedev/antd";
import { useShow, useList, useCreate, useUpdate, useDelete, useGetIdentity } from "@refinedev/core";
import {
  Descriptions, Tag, Card, Timeline, Input, Button, Select, Space, Form,
  Empty, Avatar, Popconfirm, Row, Col, Tooltip, DatePicker,
} from "antd";
import {
  PlusOutlined, MailOutlined, PhoneOutlined, WhatsAppOutlined,
  CalendarOutlined, FileTextOutlined, DeleteOutlined, EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { fmtFechaCorta, fmtFechaHora } from "../../utils/formatters";
import { LEAD_ESTADOS, LEAD_ESTADO_COLOR, LEAD_ESTADO_LABEL, ACTIVIDAD_TIPOS, ACTIVIDAD_COLOR } from "../../utils/leadEstados";

const ICON_BY_TIPO = {
  email: <MailOutlined />,
  llamada: <PhoneOutlined />,
  whatsapp: <WhatsAppOutlined />,
  reunion: <CalendarOutlined />,
  cambio_estado: <EditOutlined />,
  nota: <FileTextOutlined />,
  otro: <FileTextOutlined />,
};

export const LeadsShow = () => {
  const { queryResult } = useShow({
    resource: "leads",
    meta: { select: "*, escuelas(nombre, localidad), familias(id, apellido, grupos(grado, anio_egreso))" },
  });
  const lead = queryResult?.data?.data;
  if (!lead) return <Show isLoading={queryResult?.isLoading} />;

  return (
    <Show
      title={`Lead: ${lead.apellido || lead.email}`}
      headerButtons={({ defaultButtons }) => (
        <>
          <EditButton recordItemId={lead.id} />
          {defaultButtons}
        </>
      )}
      isLoading={queryResult.isLoading}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          <DatosCard lead={lead} onChange={queryResult.refetch} />
        </Col>
        <Col xs={24} md={14}>
          <PipelineCard lead={lead} onChange={queryResult.refetch} />
          <ActividadesCard leadId={lead.id} />
        </Col>
      </Row>
    </Show>
  );
};

// ============================================================
// Datos
// ============================================================
function DatosCard({ lead }) {
  return (
    <Card title="Contacto" size="small">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Email">
          <a href={`mailto:${lead.email}`}>{lead.email}</a>
        </Descriptions.Item>
        <Descriptions.Item label="Apellido">{lead.apellido || "—"}</Descriptions.Item>
        <Descriptions.Item label="Teléfono">
          {lead.telefono ? <a href={`tel:${lead.telefono}`}>{lead.telefono}</a> : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Escuela">
          {lead.escuelas?.nombre ? <Tag color="green">{lead.escuelas.nombre}</Tag> :
           lead.escuela_libre ? <Tag color="orange">{lead.escuela_libre} <em>(libre)</em></Tag> : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Grado / Año">
          {[lead.grado_buscado, lead.anio_egreso].filter(Boolean).join(" · ") || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Convertido a">
          {lead.familias?.id
            ? <Tag color="green">Familia {lead.familias.apellido} · {lead.familias.grupos?.grado}</Tag>
            : <span style={{ color: "#999" }}>todavía no</span>}
        </Descriptions.Item>
        <Descriptions.Item label="Origen">{lead.origen}</Descriptions.Item>
        <Descriptions.Item label="Capturado">{fmtFechaHora(lead.created_at)}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

// ============================================================
// Pipeline: cambiar estado + asignación + próxima acción + notas
// ============================================================
function PipelineCard({ lead, onChange }) {
  const { mutate: updateLead } = useUpdate();
  const { data: identity } = useGetIdentity();
  const [next, setNext] = useState(lead.next_action || "");
  const [nextAt, setNextAt] = useState(lead.next_action_at ? dayjs(lead.next_action_at) : null);
  const [notas, setNotas] = useState(lead.notas || "");

  const setEstado = (estado) => {
    updateLead(
      { resource: "leads", id: lead.id, values: { estado }, successNotification: { message: `Estado → ${estado}`, type: "success" } },
      { onSuccess: onChange },
    );
  };

  const saveFollowUp = () => {
    updateLead(
      {
        resource: "leads", id: lead.id,
        values: { next_action: next.trim() || null, next_action_at: nextAt?.toISOString() || null },
        successNotification: { message: "Próximo paso guardado", type: "success" },
      },
      { onSuccess: onChange },
    );
  };

  const saveNotas = () => {
    updateLead(
      { resource: "leads", id: lead.id, values: { notas: notas.trim() || null }, successNotification: { message: "Notas guardadas", type: "success" } },
      { onSuccess: onChange },
    );
  };

  return (
    <Card title="Pipeline" size="small" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Estado actual</p>
        <Space wrap>
          {LEAD_ESTADOS.map((e) => (
            <Button
              key={e.value}
              size="small"
              type={lead.estado === e.value ? "primary" : "default"}
              onClick={() => setEstado(e.value)}
              disabled={lead.estado === e.value}
            >
              {e.label}
            </Button>
          ))}
        </Space>
      </div>

      <Form layout="vertical" size="small">
        <Form.Item label="Próximo paso" style={{ marginBottom: 8 }}>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="Llamar el lunes / Mandar mail con info / etc."
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <DatePicker
              showTime
              value={nextAt}
              onChange={setNextAt}
              placeholder="Cuándo"
              format="DD MMM HH:mm"
              style={{ width: 180 }}
            />
            <Button type="primary" onClick={saveFollowUp}>Guardar</Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item label="Notas internas" style={{ marginBottom: 0 }}>
          <Input.TextArea
            rows={3}
            placeholder="Anotaciones libres sobre este lead…"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={saveNotas}
          />
        </Form.Item>
      </Form>
    </Card>
  );
}

// ============================================================
// Timeline de actividades + form para agregar
// ============================================================
function ActividadesCard({ leadId }) {
  const { data, refetch } = useList({
    resource: "lead_actividades",
    filters: [{ field: "lead_id", operator: "eq", value: leadId }],
    sorters: [{ field: "fecha", order: "desc" }],
    pagination: { mode: "off" },
  });
  const actividades = data?.data || [];

  return (
    <Card
      title={`Actividades (${actividades.length})`}
      size="small"
      extra={<NuevaActividadInline leadId={leadId} onAdded={refetch} />}
    >
      {actividades.length === 0 ? (
        <Empty description="Sin actividades todavía" />
      ) : (
        <Timeline
          items={actividades.map((a) => ({
            color: ACTIVIDAD_COLOR[a.tipo] || "default",
            dot: ICON_BY_TIPO[a.tipo],
            children: <ActividadItem actividad={a} onChange={refetch} />,
          }))}
        />
      )}
    </Card>
  );
}

function NuevaActividadInline({ leadId, onAdded }) {
  const { mutate: createActividad } = useCreate();
  const { data: identity } = useGetIdentity();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("nota");
  const [contenido, setContenido] = useState("");

  if (!open) {
    return (
      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
        Agregar
      </Button>
    );
  }

  const submit = () => {
    if (!contenido.trim()) return;
    createActividad(
      {
        resource: "lead_actividades",
        values: {
          lead_id: leadId,
          tipo,
          contenido: contenido.trim(),
          autor_nombre: identity?.name || null,
        },
        successNotification: false,
      },
      {
        onSuccess: () => {
          setContenido(""); setTipo("nota"); setOpen(false); onAdded();
        },
      },
    );
  };

  return (
    <Space.Compact style={{ width: 320 }}>
      <Select
        value={tipo}
        onChange={setTipo}
        style={{ width: 120 }}
        options={ACTIVIDAD_TIPOS.filter((t) => t.value !== "cambio_estado").map((t) => ({ label: t.label, value: t.value }))}
      />
      <Input
        autoFocus
        placeholder="Detalle…"
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        onPressEnter={submit}
      />
      <Button type="primary" onClick={submit} disabled={!contenido.trim()}>
        OK
      </Button>
    </Space.Compact>
  );
}

function ActividadItem({ actividad, onChange }) {
  const { mutate: deleteAct } = useDelete();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <Tag color={ACTIVIDAD_COLOR[actividad.tipo]}>{actividad.tipo}</Tag>
        <span style={{ color: "#999", fontSize: 11 }}>{fmtFechaHora(actividad.fecha)}</span>
        {actividad.autor_nombre && <span style={{ color: "#bbb", fontSize: 11 }}>· {actividad.autor_nombre}</span>}
        {actividad.tipo !== "cambio_estado" && (
          <Popconfirm title="¿Eliminar actividad?" onConfirm={() => deleteAct({ resource: "lead_actividades", id: actividad.id }, { onSuccess: onChange })}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ marginLeft: "auto" }} />
          </Popconfirm>
        )}
      </div>
      <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{actividad.contenido}</div>
    </div>
  );
}
