import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Input, Select, DatePicker } from "antd";
import dayjs from "dayjs";

export const FechasReunionEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({ resource: "fechas_reunion" });
  const record = queryResult?.data?.data;

  const { options: grupos } = useSelect({
    resource: "grupos",
    optionLabel: (g) => `${g.escuelas?.nombre || ""} · ${g.grado} (${g.anio_egreso})`,
    optionValue: "id",
    meta: { select: "id, grado, anio_egreso, escuelas(nombre)" },
  });

  const initial = record ? { ...record, fecha: dayjs(record.fecha) } : undefined;
  const onFinish = (values) => formProps.onFinish({ ...values, fecha: values.fecha?.toISOString() });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" initialValues={initial} onFinish={onFinish}>
        <Form.Item label="Grupo" name="grupo_id" rules={[{ required: true }]}>
          <Select options={grupos} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label="Fecha y hora" name="fecha" rules={[{ required: true }]}>
          <DatePicker showTime format="DD MMM YYYY HH:mm" />
        </Form.Item>
        <Form.Item label="Ubicación o link" name="ubicacion">
          <Input />
        </Form.Item>
      </Form>
    </Edit>
  );
};
