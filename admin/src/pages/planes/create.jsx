import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Input, InputNumber, Select } from "antd";
import { useEmpresaContext } from "../../contexts/EmpresaContext";

export const PlanesCreate = () => {
  const { empresaId } = useEmpresaContext();
  const { formProps, saveButtonProps } = useForm({ resource: "planes_viaje" });
  const { options: destinos } = useSelect({
    resource: "destinos",
    optionLabel: "nombre",
    optionValue: "id",
    filters: empresaId ? [{ field: "empresa_id", operator: "eq", value: empresaId }] : [],
  });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Destino" name="destino_id" rules={[{ required: true }]}>
          <Select options={destinos} showSearch optionFilterProp="label" />
        </Form.Item>
        <PlanFormFields />
      </Form>
    </Create>
  );
};

// Componente de campos comunes a create/edit. Se usa también en el modal nested.
export const PlanFormFields = () => (
  <>
    <Form.Item label="Plan de pago" name="plan_pago">
      <Input />
    </Form.Item>
    <Form.Item label="Transporte" name="transporte">
      <Select options={[{ value: "Bus" }, { value: "Avión" }]} allowClear />
    </Form.Item>
    <Form.Item label="Días" name="dias"><InputNumber min={1} /></Form.Item>
    <Form.Item label="Noches" name="noches"><InputNumber min={1} /></Form.Item>
    <Form.Item label="Cuotas" name="cantidad_cuotas"><InputNumber min={1} /></Form.Item>
    <Form.Item label="Cuota mensual" name="cuota_mensual"><InputNumber min={0} step={1000} /></Form.Item>
    <Form.Item label="Inscripción" name="inscripcion"><InputNumber min={0} step={1000} /></Form.Item>
    <Form.Item label="Reserva" name="reserva"><InputNumber min={0} step={1000} /></Form.Item>
    <Form.Item label="Primera cuota" name="primera_cuota"><InputNumber min={0} step={1000} /></Form.Item>
    <Form.Item label="Anticipo saldo" name="anticipo_saldo"><InputNumber min={0} step={1000} /></Form.Item>
    <Form.Item label="Total final" name="total_final"><InputNumber min={0} step={1000} /></Form.Item>
    <Form.Item label="Vigencia" name="vigencia"><Input /></Form.Item>
    <Form.Item label="Actividades" name="actividades"><Input.TextArea rows={2} /></Form.Item>
    <Form.Item label="Liberados" name="liberados"><Input /></Form.Item>
    <Form.Item label="Seguro" name="seguro"><Input /></Form.Item>
    <Form.Item label="Descuentos" name="descuentos"><Input /></Form.Item>
  </>
);
