import React, { useState } from "react";
import { Create } from "@refinedev/antd";
import { useCreate, useUpdate, useSelect, useNavigation } from "@refinedev/core";
import { Form, Select, Upload, Alert, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../lib/supabaseClient";
import { useEmpresaContext } from "../../contexts/EmpresaContext";

// Upload de documentos con post-procesamiento mock IA.
// Subida directa a Supabase Storage (customRequest) + insert + transición
// async pendiente → procesando → procesado.
export const DocumentosCreate = () => {
  const { empresaId } = useEmpresaContext();
  const { list } = useNavigation();
  const { mutate: createDoc } = useCreate();
  const { mutate: updateDoc } = useUpdate();
  const [destinoId, setDestinoId] = useState(null);
  const [uploaded, setUploaded] = useState([]);

  const { options: destinos } = useSelect({
    resource: "destinos",
    optionLabel: "nombre",
    optionValue: "id",
    filters: [
      ...(empresaId ? [{ field: "empresa_id", operator: "eq", value: empresaId }] : []),
      { field: "activo", operator: "eq", value: true },
    ],
  });

  const customRequest = async ({ file, onSuccess, onError }) => {
    if (!destinoId) {
      message.error("Elegí un destino primero");
      onError(new Error("No destino"));
      return;
    }
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
        },
        {
          onSuccess: ({ data }) => {
            onSuccess({ id: data.id });
            setUploaded((u) => [...u, { id: data.id, nombre: file.name }]);
            runMockIA(data.id, file.name, updateDoc);
          },
          onError: async (err) => {
            await supabaseClient.storage.from("documentos").remove([path]);
            onError(err);
          },
        },
      );
    } catch (e) {
      onError(e);
    }
  };

  return (
    <Create
      title="Subir documento"
      headerButtons={() => null}
      footerButtons={() => null}
    >
      <Form layout="vertical">
        <Form.Item label="Destino" required>
          <Select
            options={destinos}
            value={destinoId}
            onChange={setDestinoId}
            showSearch
            optionFilterProp="label"
            placeholder="Elegí destino"
          />
        </Form.Item>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Procesamiento IA (mock)"
          description="Después de subir el archivo, un mock client-side simula la extracción de datos por IA. El procesamiento real va a vivir en una edge function."
        />

        <Upload.Dragger
          customRequest={customRequest}
          disabled={!destinoId}
          accept="application/pdf,image/*"
          multiple
          showUploadList
          beforeUpload={(file) => {
            if (file.size > 10_000_000) {
              message.error("Tamaño máximo 10MB");
              return Upload.LIST_IGNORE;
            }
            return true;
          }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Arrastrá archivos acá o hacé clic para seleccionar</p>
          <p className="ant-upload-hint">PDF o imagen, máx 10MB por archivo</p>
        </Upload.Dragger>

        {uploaded.length > 0 && (
          <Alert
            type="success"
            style={{ marginTop: 16 }}
            message={`${uploaded.length} documento(s) subido(s).`}
            description={
              <a onClick={() => list("documentos")}>Volver a la lista →</a>
            }
          />
        )}
      </Form>
    </Create>
  );
};

async function runMockIA(docId, fileName, updateDoc) {
  updateDoc({
    resource: "documentos", id: docId,
    values: { procesado_estado: "procesando" },
    successNotification: false,
  });
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
  });
}
