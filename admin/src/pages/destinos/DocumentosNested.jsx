import React, { useRef } from "react";
import { useCreate, useUpdate, useDelete } from "@refinedev/core";
import { Table, Button, Space, Popconfirm, Upload, Tag, Tooltip } from "antd";
import { UploadOutlined, DeleteOutlined, FileTextOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../lib/supabaseClient";
import { DOC_PROCESADO_COLOR } from "../../utils/estados";

// Tabla anidada de documentos del destino. Upload directo a Storage + insert
// + mock IA. La página /documentos/create de Fase D extiende este patrón.
export const DocumentosNested = ({ destinoId, documentos, onChange }) => {
  const uploadingRef = useRef(false);
  const { mutate: createDoc } = useCreate();
  const { mutate: updateDoc } = useUpdate();
  const { mutate: deleteDoc } = useDelete();

  const customRequest = async ({ file, onSuccess, onError }) => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      const path = `destino_${destinoId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabaseClient.storage.from("documentos").upload(path, file);
      if (upErr) throw upErr;

      createDoc(
        {
          resource: "documentos",
          values: {
            destino_id: destinoId,
            nombre: file.name,
            storage_path: path,
            mime_type: file.type,
            size_bytes: file.size,
            procesado_estado: "pendiente",
          },
          successNotification: { message: "Documento subido", type: "success" },
        },
        {
          onSuccess: ({ data }) => {
            onSuccess({ id: data.id });
            onChange();
            runMockIA(data.id, file.name, updateDoc, onChange);
          },
          onError: async (err) => {
            await supabaseClient.storage.from("documentos").remove([path]);
            onError(err);
          },
        },
      );
    } catch (e) {
      onError(e);
    } finally {
      uploadingRef.current = false;
    }
  };

  const remove = async (doc) => {
    await supabaseClient.storage.from("documentos").remove([doc.storage_path]);
    deleteDoc({ resource: "documentos", id: doc.id }, { onSuccess: onChange });
  };

  return (
    <>
      <Upload customRequest={customRequest} showUploadList={false} accept="application/pdf,image/*">
        <Button size="small" type="primary" icon={<UploadOutlined />} style={{ marginBottom: 8 }}>
          Subir documento
        </Button>
      </Upload>
      <Table dataSource={documentos} rowKey="id" pagination={false} size="small">
        <Table.Column
          dataIndex="nombre"
          title="Archivo"
          render={(v) => <Space><FileTextOutlined /> {v}</Space>}
        />
        <Table.Column
          dataIndex="procesado_estado"
          title="Procesado IA"
          render={(v) => <Tag color={DOC_PROCESADO_COLOR[v] || "default"}>{v}</Tag>}
        />
        <Table.Column
          title=""
          render={(_, d) => (
            <Popconfirm title="¿Eliminar documento?" onConfirm={() => remove(d)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        />
      </Table>
    </>
  );
};

// Mock IA — el real va a vivir en supabase/functions/procesar-documento/.
async function runMockIA(docId, fileName, updateDoc, onChange) {
  updateDoc({
    resource: "documentos", id: docId,
    values: { procesado_estado: "procesando" },
    successNotification: false,
  }, { onSuccess: onChange });
  await new Promise((r) => setTimeout(r, 2000));
  updateDoc({
    resource: "documentos", id: docId,
    values: {
      procesado_estado: "procesado",
      procesado_at: new Date().toISOString(),
      datos_extraidos: {
        mock: true,
        nombre_original: fileName,
        planes_detectados: [
          { plan_pago: "Contado", total_final: 1500000 },
          { plan_pago: "12 cuotas", cantidad_cuotas: 12, cuota_mensual: 140000 },
        ],
      },
    },
    successNotification: false,
  }, { onSuccess: onChange });
}
