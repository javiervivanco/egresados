import React, { useEffect, useState } from "react";
import { Create, useForm } from "@refinedev/antd";
import { useSelect, useList } from "@refinedev/core";
import { Form, Input, InputNumber, Select, Descriptions } from "antd";
import { useEmpresaContext } from "../../contexts/EmpresaContext";
import { fmtARS } from "../../utils/formatters";

// Form con cálculos en vivo: total = pasajeros × precio_unitario,
// comision = total × pct / 100. Cascada destino → plan que auto-llena precio.
//
// monto_total y comision_monto son generated columns en DB — NO se mandan
// en el payload. Filtramos en onFinish.
export const VentasCreate = () => {
  const { empresaId } = useEmpresaContext();
  const { formProps, saveButtonProps, form } = useForm({ resource: "ventas" });

  const cantidad = Form.useWatch("cantidad_pasajeros", form);
  const precio = Form.useWatch("precio_unitario", form);
  const pct = Form.useWatch("comision_pct", form);
  const destinoId = Form.useWatch("destino_id", form);

  const total = (Number(cantidad) || 0) * (Number(precio) || 0);
  const comision = (total * (Number(pct) || 0)) / 100;

  const { options: grupos } = useSelect({
    resource: "grupos",
    optionLabel: (g) => `${g.escuelas?.nombre || ""} · ${g.grado} (${g.anio_egreso})`,
    optionValue: "id",
    meta: { select: "id, grado, anio_egreso, escuelas(nombre)" },
    filters: [{ field: "estado", operator: "eq", value: "activo" }],
  });

  const { options: destinos } = useSelect({
    resource: "destinos",
    optionLabel: "nombre",
    optionValue: "id",
    filters: [
      ...(empresaId ? [{ field: "empresa_id", operator: "eq", value: empresaId }] : []),
      { field: "activo", operator: "eq", value: true },
    ],
  });

  // Cargar planes del destino actual y permitir auto-fill de precio.
  const { data: planesData } = useList({
    resource: "planes_viaje",
    meta: { select: "id, plan_pago, total_final" },
    filters: [{ field: "destino_id", operator: "eq", value: destinoId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!destinoId },
  });
  const planes = planesData?.data || [];
  const planOptions = planes.map((p) => ({ label: `${p.plan_pago} (${fmtARS(p.total_final)})`, value: p.id }));

  const onPlanChange = (planId) => {
    const plan = planes.find((p) => p.id === planId);
    if (plan?.total_final) form.setFieldValue("precio_unitario", plan.total_final);
  };

  // Filtro de campos generados antes de enviar al PATCH.
  const onFinish = (values) => {
    const { monto_total, comision_monto, ...payload } = values;
    return formProps.onFinish({ ...payload, empresa_id: empresaId, estado: "borrador" });
  };

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{ comision_pct: 8 }}
        onFinish={onFinish}
      >
        <Form.Item label="Grupo" name="grupo_id" rules={[{ required: true }]}>
          <Select options={grupos} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label="Destino" name="destino_id">
          <Select
            options={destinos}
            showSearch
            optionFilterProp="label"
            allowClear
            onChange={() => form.setFieldValue("plan_id", null)}
          />
        </Form.Item>
        <Form.Item label="Plan" name="plan_id">
          <Select
            options={planOptions}
            disabled={!destinoId}
            allowClear
            onChange={onPlanChange}
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
          <Descriptions.Item label="Total">
            <strong>{fmtARS(total)}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Comisión">
            <strong style={{ color: "#E76F51" }}>{fmtARS(comision)}</strong>
          </Descriptions.Item>
        </Descriptions>
      </Form>
    </Create>
  );
};
