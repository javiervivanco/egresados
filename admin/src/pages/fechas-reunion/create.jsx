import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Input, Select, DatePicker } from "antd";
import dayjs from "dayjs";
import { useEmpresaContext } from "../../contexts/EmpresaContext";

export const FechasReunionCreate = () => {
  const { empresaId } = useEmpresaContext();
  const { formProps, saveButtonProps } = useForm({
    resource: "fechas_reunion",
    redirect: "list",
  });
  const { options: grupos } = useSelect({
    resource: "grupos",
    optionLabel: (g) => `${g.escuelas?.nombre || ""} · ${g.grado} (${g.anio_egreso})`,
    optionValue: "id",
    meta: { select: "id, grado, anio_egreso, escuelas(nombre)" },
    filters: [{ field: "estado", operator: "eq", value: "activo" }],
  });

  // DatePicker devuelve dayjs; convertimos a ISO en onFinish.
  const onFinish = (values) => formProps.onFinish({
    ...values,
    empresa_id: empresaId,
    fecha: values.fecha?.toISOString(),
    estado: "propuesta",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" onFinish={onFinish}>
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
    </Create>
  );
};
