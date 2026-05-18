import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space, Typography, Empty, Spin, Alert } from "antd";
import {
  UserOutlined, UsergroupAddOutlined, CalendarOutlined, CheckCircleOutlined,
  DollarOutlined, FireOutlined, EnvironmentOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { supabaseClient as supabase } from "../../lib/supabaseClient";

const { Title, Text } = Typography;

// Dashboard del super_admin: drop-off del funnel, UTM aggregator y
// conversión por ciudad. Lee directamente de las views agregadas
// (dashboard_*). Nada de cómputos en cliente que se puedan resolver en SQL.

export const DashboardFunnel = () => {
  const [funnel, setFunnel] = useState(null);
  const [utm, setUtm] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [score, setScore] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [f, u, c, s] = await Promise.all([
          supabase.from("dashboard_funnel").select("*").maybeSingle(),
          supabase.from("dashboard_utm").select("*"),
          supabase.from("dashboard_ciudades").select("*"),
          supabase.from("dashboard_score_buckets").select("*"),
        ]);
        if (cancelled) return;
        if (f.error) throw f.error;
        setFunnel(f.data);
        setUtm(u.data || []);
        setCiudades(c.data || []);
        setScore(s.data || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Error cargando dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spin tip="Calculando..." style={{ padding: 32 }} />;
  if (error) return <Alert type="error" message={error} showIcon />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <FunnelSection funnel={funnel} />
      <Row gutter={16}>
        <Col xs={24} lg={12}><ScoreSection score={score} total={funnel?.leads_total || 0} /></Col>
        <Col xs={24} lg={12}><CiudadesSection ciudades={ciudades} /></Col>
      </Row>
      <UTMSection utm={utm} />
    </div>
  );
};

// =============================================================
// Funnel: KPIs en cascada con tasa de conversión entre etapas
// =============================================================
function FunnelSection({ funnel }) {
  if (!funnel) return null;

  // Las etapas se cuentan respecto a leads_total para conversión global.
  const etapas = [
    { key: "leads_total",                label: "Leads",                 icon: <UserOutlined />,         color: "#722ed1" },
    { key: "leads_a_familia",            label: "Convertidos a familia", icon: <UsergroupAddOutlined />, color: "#1677ff" },
    { key: "familias_voto_fecha",        label: "Votaron fecha",         icon: <CalendarOutlined />,     color: "#13c2c2" },
    { key: "grupos_con_reunion",         label: "Reunión confirmada",    icon: <CheckCircleOutlined />,  color: "#52c41a", note: "grupos" },
    { key: "familias_voto_plan_completo",label: "Votaron 3 prioridades", icon: <ThunderboltOutlined />,  color: "#faad14" },
    { key: "grupos_con_venta",           label: "Venta cerrada",         icon: <DollarOutlined />,       color: "#fa541c", note: "grupos" },
  ];

  const total = Math.max(funnel.leads_total || 0, 1);

  return (
    <Card title={<><FireOutlined /> Funnel global</>} size="small">
      <Row gutter={[12, 12]}>
        {etapas.map(({ key, label, icon, color, note }) => {
          const value = funnel[key] ?? 0;
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <Col xs={24} sm={12} md={8} lg={4} key={key}>
              <Card size="small" style={{ borderTop: `3px solid ${color}` }}>
                <Statistic title={<><span style={{ color }}>{icon}</span> {label}</>} value={value} />
                <Progress percent={pct} showInfo={false} strokeColor={color} size="small" />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {pct}% del total{note ? ` · ${note}` : ""}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
        Las etapas no son strictly transitivas (un grupo con venta no necesariamente
        votó las 3 prioridades). Lee cada KPI como "cuántos llegaron al menos hasta acá".
      </Text>
    </Card>
  );
}

// =============================================================
// Score: distribución de leads en buckets de temperatura
// =============================================================
function ScoreSection({ score, total }) {
  return (
    <Card title={<><ThunderboltOutlined /> Score de leads</>} size="small">
      {score.length === 0 ? <Empty description="Sin leads" /> : (
        <Space direction="vertical" style={{ width: "100%" }}>
          {score.map((b) => {
            const pct = total > 0 ? Math.round((b.leads / total) * 100) : 0;
            return (
              <div key={b.bucket}>
                <Space size="small">
                  <Text strong>{b.bucket}</Text>
                  <Tag>{b.leads}</Tag>
                </Space>
                <Progress percent={pct} size="small" />
              </div>
            );
          })}
        </Space>
      )}
    </Card>
  );
}

// =============================================================
// Conversión por ciudad
// =============================================================
function CiudadesSection({ ciudades }) {
  return (
    <Card title={<><EnvironmentOutlined /> Por ciudad</>} size="small">
      {ciudades.length === 0 ? <Empty description="Sin ciudades cargadas" /> : (
        <Table
          dataSource={ciudades}
          rowKey="ciudad_id"
          pagination={{ pageSize: 10, size: "small" }}
          size="small"
          columns={[
            {
              title: "Ciudad",
              dataIndex: "ciudad",
              render: (v, r) => (
                <Space size={4} direction="vertical" style={{ lineHeight: 1.2 }}>
                  <Text strong>{v}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{r.provincia || "—"}</Text>
                </Space>
              ),
            },
            { title: "Escuelas", dataIndex: "escuelas", align: "right", width: 70 },
            { title: "Grupos", dataIndex: "grupos", align: "right", width: 70 },
            { title: "Familias", dataIndex: "familias", align: "right", width: 80 },
            {
              title: "Ventas",
              dataIndex: "ventas_cerradas", align: "right", width: 70,
              render: (v) => v > 0 ? <Tag color="green">{v}</Tag> : <Text type="secondary">0</Text>,
            },
            {
              title: "Empresas",
              dataIndex: "empresas_operan", align: "right", width: 80,
              render: (v) => v === 0
                ? <Tag color="warning">sin empresas</Tag>
                : <Tag color="blue">{v}</Tag>,
            },
          ]}
        />
      )}
    </Card>
  );
}

// =============================================================
// Atribución UTM
// =============================================================
function UTMSection({ utm }) {
  return (
    <Card title={<>Cohortes por campaña (UTM)</>} size="small">
      {utm.length === 0 ? <Empty description="Sin leads aún" /> : (
        <Table
          dataSource={utm}
          rowKey={(r) => `${r.campaign}|${r.source}|${r.medium}`}
          pagination={{ pageSize: 10, size: "small" }}
          size="small"
          columns={[
            { title: "Campaign", dataIndex: "campaign" },
            { title: "Source", dataIndex: "source", width: 120 },
            { title: "Medium", dataIndex: "medium", width: 120 },
            { title: "Leads",  dataIndex: "leads", align: "right", width: 80 },
            {
              title: "Convirtieron",
              dataIndex: "familias", align: "right", width: 110,
              render: (v, r) => {
                const pct = r.leads > 0 ? Math.round((v / r.leads) * 100) : 0;
                return <Space>{v}<Tag color={pct >= 30 ? "green" : pct >= 10 ? "blue" : "default"}>{pct}%</Tag></Space>;
              },
            },
            {
              title: "Score promedio",
              dataIndex: "score_promedio", align: "right", width: 110,
            },
            {
              title: "Vigencia",
              dataIndex: "primer_lead",
              render: (v, r) => (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {v ? new Date(v).toLocaleDateString("es-AR") : ""}
                  {r.ultimo_lead && r.ultimo_lead !== v ? ` → ${new Date(r.ultimo_lead).toLocaleDateString("es-AR")}` : ""}
                </Text>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
