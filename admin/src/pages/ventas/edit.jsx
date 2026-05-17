import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useSelect, useList } from "@refinedev/core";
import { Form, Input, InputNumber, Select, Descriptions, Alert } from "antd";
import { fmtARS } from "../../utils/formatters";

export const VentasEdit = () => {
  const { formProps, saveButtonProps, form, queryResult } = useForm({ resource: "ventas" });
  const record = queryResult?.data?.data;

  const cantidad = Form.useWatch("cantidad_pasajeros", form);
  const precio = Form.useWatch("precio_unitario", form);
  const pct = Form.useWatch("comision_pct", form);
  const destinoId = Form.useWatch("destino_id", form);

  const total = (Number(cantidad) || 0) * (Number(precio) || 0);
  const comision = (total * (Number(pct) || 0)) / 100;

  const editable = record?.estado === "borrador" || record?.estado === "confirmada";

  const { options: grupos } = useSelect({
    resource: "grupos",
    optionLabel: (g) => `${g.escuelas?.nombre || ""} · ${g.grado} (${g.anio_egreso})`,
    optionValue: "id",
    meta: { select: "id, grado, anio_egreso, escuelas(nombre)" },
  });
  const { options: destinos } = useSelect({ resource: "destinos", optionLabel: "nombre", optionValue: "id" });
  const { data: planesData } = useList({
    resource: "planes_viaje",
    meta: { select: "id, plan_pago, total_final" },
    filters: [{ field: "destino_id", operator: "eq", value: destinoId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!destinoId },
  });
  const planes = planesData?.data || [];

  const onFinish = (values) => {
    const { monto_total, comision_monto, ...payload } = values;
    return formProps.onFinish(payload);
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      {!editable && (
        <Alert
          type="warning"
          message="Venta no editable"
          description={`La venta está en estado "${record?.estado}" — solo super_admin puede modificarla.`}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form {...formProps} layout="vertical" onFinish={onFinish} disabled={!editable}>
        <Form.Item label="Grupo" name="grupo_id" rules={[{ required: true }]}>
          <Select options={grupos} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label="Destino" name="destino_id">
          <Select options={destinos} showSearch optionFilterProp="label" allowClear />
        </Form.Item>
        <Form.Item label="Plan" name="plan_id">
          <Select
            options={planes.map((p) => ({ label: `${p.plan_pago} (${fmtARS(p.total_final)})`, value: p.id }))}
            allowClear
          />
        </Form.Item>
        <Form.Item label="Pasajeros" name="cantidad_pasajeros" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item label="Precio unitario" name="precio_unitario" rules={[{ required: true }]}>
          <InputNumber min={0} step={1000} style={{ width: 240 }} />
        </Form.Item>
        <Form.Item label="Comisión %" name="comision_pct">
          <InputNumber min={0} max={100} step={0.5} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item label="Observaciones" name="observaciones">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="Total"><strong>{fmtARS(total)}</strong></Descriptions.Item>
          <Descriptions.Item label="Comisión"><strong style={{ color: "#E76F51" }}>{fmtARS(comision)}</strong></Descriptions.Item>
        </Descriptions>
      </Form>
    </Edit>
  );
};
