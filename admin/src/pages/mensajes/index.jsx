import React, { useEffect, useMemo, useRef, useState } from "react";
import { List } from "@refinedev/antd";
import { useList, useCreate, useUpdateMany, useGetIdentity } from "@refinedev/core";
import { Row, Col, Card, List as AntList, Avatar, Badge, Empty, Input, Button } from "antd";
import { SendOutlined, TeamOutlined } from "@ant-design/icons";
import { useEmpresaContext } from "../../contexts/EmpresaContext";
import { fmtFechaHora } from "../../utils/formatters";

// Chat threading empresa ↔ grupo. Lista de hilos a la izquierda
// (union de fechas_reunion + mensajes), conversación a la derecha.
export const MensajesPage = () => {
  const { data: identity } = useGetIdentity();
  const { empresaId } = useEmpresaContext();
  const [grupoId, setGrupoId] = useState(null);

  const { data: dFechas } = useList({
    resource: "fechas_reunion",
    meta: { select: "grupo_id, grupos(grado, anio_egreso, escuelas(nombre))" },
    filters: empresaId ? [{ field: "empresa_id", operator: "eq", value: empresaId }] : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!empresaId },
  });
  const { data: dMensajes } = useList({
    resource: "mensajes",
    meta: { select: "grupo_id, leido_empresa, grupos:grupo_id(grado, anio_egreso, escuelas(nombre))" },
    filters: empresaId ? [{ field: "empresa_id", operator: "eq", value: empresaId }] : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!empresaId },
  });

  const hilos = useMemo(() => {
    const byId = new Map();
    for (const r of (dFechas?.data || [])) {
      if (!byId.has(r.grupo_id)) byId.set(r.grupo_id, {
        grupo_id: r.grupo_id,
        label: `${r.grupos?.escuelas?.nombre || ""} · ${r.grupos?.grado || ""} (${r.grupos?.anio_egreso || ""})`,
        sin_leer: 0,
      });
    }
    for (const r of (dMensajes?.data || [])) {
      const e = byId.get(r.grupo_id) || {
        grupo_id: r.grupo_id,
        label: `${r.grupos?.escuelas?.nombre || ""} · ${r.grupos?.grado || ""} (${r.grupos?.anio_egreso || ""})`,
        sin_leer: 0,
      };
      if (r.leido_empresa === false) e.sin_leer++;
      byId.set(r.grupo_id, e);
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [dFechas, dMensajes]);

  return (
    <List title="Mensajes con grupos">
      <Row gutter={16} style={{ height: "calc(100vh - 240px)", minHeight: 500 }}>
        <Col xs={24} md={9} style={{ height: "100%" }}>
          <Card title="Hilos" styles={{ body: { padding: 0, overflow: "auto", maxHeight: "calc(100% - 56px)" } }} style={{ height: "100%" }}>
            {hilos.length === 0 ? (
              <Empty description="Sin hilos activos" style={{ padding: 24 }} />
            ) : (
              <AntList
                dataSource={hilos}
                renderItem={(h) => (
                  <AntList.Item
                    onClick={() => setGrupoId(h.grupo_id)}
                    style={{ cursor: "pointer", padding: 12, background: h.grupo_id === grupoId ? "#E5EFE3" : undefined }}
                  >
                    <AntList.Item.Meta
                      avatar={<Avatar icon={<TeamOutlined />} style={{ background: "#2D5A27" }} />}
                      title={h.label}
                      description={h.sin_leer > 0 ? <Badge count={h.sin_leer} /> : <span style={{ color: "#999", fontSize: 11 }}>al día</span>}
                    />
                  </AntList.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={15} style={{ height: "100%" }}>
          {grupoId && empresaId ? (
            <Thread empresaId={empresaId} empresaNombre={identity?.empresa_nombre || "Empresa"} grupoId={grupoId} />
          ) : (
            <Card style={{ height: "100%" }}>
              <Empty description="Elegí un hilo para ver la conversación" />
            </Card>
          )}
        </Col>
      </Row>
    </List>
  );
};

function Thread({ empresaId, empresaNombre, grupoId }) {
  const { data, refetch } = useList({
    resource: "mensajes",
    meta: { select: "id, autor_rol, autor_nombre, contenido, created_at, leido_empresa" },
    filters: [
      { field: "grupo_id", operator: "eq", value: grupoId },
      { field: "empresa_id", operator: "eq", value: empresaId },
    ],
    sorters: [{ field: "created_at", order: "asc" }],
    pagination: { mode: "off" },
  });

  const { mutate: createMensaje } = useCreate();
  const { mutate: markRead } = useUpdateMany();
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);
  const mensajes = data?.data || [];

  // Marca como leídos los recibidos
  useEffect(() => {
    const noLeidos = mensajes.filter((m) => m.autor_rol === "familia" && !m.leido_empresa);
    if (noLeidos.length === 0) return;
    markRead({
      resource: "mensajes",
      ids: noLeidos.map((m) => m.id),
      values: { leido_empresa: true },
      successNotification: false,
    });
  }, [mensajes, markRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    createMensaje({
      resource: "mensajes",
      values: {
        grupo_id: grupoId,
        empresa_id: empresaId,
        autor_rol: "empresa",
        autor_nombre: empresaNombre,
        contenido: text,
      },
      successNotification: false,
    }, {
      onSuccess: () => { setDraft(""); refetch(); },
    });
  };

  return (
    <Card title="Conversación" style={{ height: "100%", display: "flex", flexDirection: "column" }} styles={{ body: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" } }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {mensajes.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.autor_rol === "empresa" ? "flex-end" : "flex-start", margin: "6px 0" }}>
            <div style={{
              maxWidth: "75%",
              padding: "8px 12px",
              borderRadius: 12,
              background: m.autor_rol === "empresa" ? "#2D5A27" : "#FFF",
              color: m.autor_rol === "empresa" ? "#FFF" : "#264653",
              border: m.autor_rol === "empresa" ? "none" : "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>
                {m.autor_nombre} · {fmtFechaHora(m.created_at)}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.contenido}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Input.TextArea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escribí un mensaje…"
        />
        <Button type="primary" icon={<SendOutlined />} onClick={send} disabled={!draft.trim()}>
          Enviar
        </Button>
      </div>
    </Card>
  );
}
