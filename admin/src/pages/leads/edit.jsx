import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Input, Select, DatePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import { LEAD_ESTADOS } from "../../utils/leadEstados";

export const LeadsEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({ resource: "leads" });
  const record = queryResult?.data?.data;

  const { options: escuelas } = useSelect({ resource: "escuelas", optionLabel: "nombre", optionValue: "id" });

  const initial = record
    ? { ...record, next_action_at: record.next_action_at ? dayjs(record.next_action_at) : null }
    : undefined;

  const onFinish = (values) => formProps.onFinish({
    ...values,
    next_action_at: values.next_action_at?.toISOString() || null,
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" initialValues={initial} onFinish={onFinish}>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Apellido" name="apellido">
          <Input />
        </Form.Item>
        <Form.Item label="Teléfono" name="telefono">
          <Input />
        </Form.Item>
        <Form.Item label="Estado" name="estado">
          <Select options={LEAD_ESTADOS.map((e) => ({ label: e.label, value: e.value }))} />
        </Form.Item>
        <Form.Item label="Escuela (en sistema)" name="escuela_id">
          <Select allowClear options={escuelas} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label="Escuela libre (tipeada)" name="escuela_libre" help="Si no encontró la escuela en la lista">
          <Input />
        </Form.Item>
        <Form.Item label="Grado buscado" name="grado_buscado">
          <Input />
        </Form.Item>
        <Form.Item label="Año egreso" name="anio_egreso">
          <InputNumber min={2024} max={2050} />
        </Form.Item>
        <Form.Item label="Próximo paso" name="next_action">
          <Input />
        </Form.Item>
        <Form.Item label="Próximo paso (fecha)" name="next_action_at">
          <DatePicker showTime format="DD MMM YYYY HH:mm" />
        </Form.Item>
        <Form.Item label="Notas" name="notas">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
