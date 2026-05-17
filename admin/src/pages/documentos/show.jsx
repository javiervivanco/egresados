import React from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Descriptions, Typography, Tag, Card } from "antd";
import { DOC_PROCESADO_COLOR } from "../../utils/estados";
import { fmtFechaHora } from "../../utils/formatters";

export const DocumentosShow = () => {
  const { queryResult } = useShow({
    resource: "documentos",
    meta: { select: "*, destinos(nombre, empresas(nombre))" },
  });
  const d = queryResult?.data?.data;
  if (!d) return null;

  return (
    <Show isLoading={queryResult.isLoading}>
      <Descriptions bordered column={2} size="middle">
        <Descriptions.Item label="Archivo" span={2}>{d.nombre}</Descriptions.Item>
        <Descriptions.Item label="Empresa">{d.destinos?.empresas?.nombre || "—"}</Descriptions.Item>
        <Descriptions.Item label="Destino">{d.destinos?.nombre || "—"}</Descriptions.Item>
        <Descriptions.Item label="MIME">{d.mime_type || "—"}</Descriptions.Item>
        <Descriptions.Item label="Tamaño">{d.size_bytes ? `${(d.size_bytes / 1024).toFixed(1)} KB` : "—"}</Descriptions.Item>
        <Descriptions.Item label="Procesado">
          <Tag color={DOC_PROCESADO_COLOR[d.procesado_estado]}>{d.procesado_estado}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Procesado at">{fmtFechaHora(d.procesado_at)}</Descriptions.Item>
        <Descriptions.Item label="Storage path" span={2}>
          <Typography.Text code>{d.storage_path}</Typography.Text>
        </Descriptions.Item>
      </Descriptions>

      {d.datos_extraidos && (
        <Card title="Datos extraídos por IA" style={{ marginTop: 16 }} size="small">
          <pre style={{ margin: 0, fontSize: 12, background: "#f5f5f5", padding: 12, borderRadius: 4, overflow: "auto" }}>
            {JSON.stringify(d.datos_extraidos, null, 2)}
          </pre>
        </Card>
      )}
    </Show>
  );
};
