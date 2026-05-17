import React, { useState } from "react";
import { useCreate, useUpdate, useDelete } from "@refinedev/core";
import { Table, Button, Space, Popconfirm, Modal, Form, Input, InputNumber, Select } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fmtARS } from "../../utils/formatters";

// Tabla anidada de planes_viaje dentro de la fila de destino. CRUD via Modal.
export const PlanesNested = ({ destinoId, planes, onChange }) => {
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { mutate: createPlan } = useCreate();
  const { mutate: updatePlan } = useUpdate();
  const { mutate: deletePlan } = useDelete();

  const submit = (values) => {
    // Limpiar strings vacíos → null para campos numéricos
    const payload = {};
    for (const [k, v] of Object.entries(values)) payload[k] = v === "" ? null : v;

    if (editing) {
      updatePlan(
        { resource: "planes_viaje", id: editing.id, values: payload },
        { onSuccess: () => { setEditing(null); onChange(); } },
      );
    } else {
      createPlan(
        { resource: "planes_viaje", values: { ...payload, destino_id: destinoId } },
        { onSuccess: () => { setCreating(false); onChange(); } },
      );
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
          Nuevo plan
        </Button>
      </Space>
      <Table dataSource={planes} rowKey="id" pagination={false} size="small">
        <Table.Column dataIndex="plan_pago" title="Plan" />
        <Table.Column dataIndex="transporte" title="Transp." />
        <Table.Column title="Días" render={(_, p) => `${p.dias || "—"}d/${p.noches || "—"}n`} />
        <Table.Column dataIndex="cuota_mensual" title="Cuota" align="right" render={fmtARS} />
        <Table.Column dataIndex="total_final" title="Total" align="right" render={fmtARS} />
        <Table.Column
          title=""
          render={(_, p) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(p)} />
              <Popconfirm title="¿Eliminar plan?" onConfirm={() => deletePlan({ resource: "planes_viaje", id: p.id }, { onSuccess: onChange })}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        />
      </Table>
      <PlanModal
        open={creating || !!editing}
        initial={editing}
        onCancel={() => { setCreating(false); setEditing(null); }}
        onOk={submit}
      />
    </>
  );
};

function PlanModal({ open, initial, onCancel, onOk }) {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      form.resetFields();
      if (initial) form.setFieldsValue(initial);
    }
  }, [open, initial, form]);

  return (
    <Modal
      open={open}
      title={initial ? "Editar plan" : "Nuevo plan"}
      width={720}
      onCancel={onCancel}
      onOk={() => form.validateFields().then((v) => onOk(v))}
      okText={initial ? "Guardar" : "Crear"}
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical">
        <Space size="middle" style={{ display: "flex", flexWrap: "wrap" }} wrap>
          <Form.Item label="Transporte" name="transporte" style={{ width: 140 }}>
            <Select options={[{ value: "Bus" }, { value: "Avión" }]} allowClear />
          </Form.Item>
          <Form.Item label="Plan de pago" name="plan_pago" style={{ width: 220 }}>
            <Input />
          </Form.Item>
          <Form.Item label="Días" name="dias" style={{ width: 90 }}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="Noches" name="noches" style={{ width: 90 }}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="Cuotas" name="cantidad_cuotas" style={{ width: 100 }}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item label="Cuota mensual" name="cuota_mensual" style={{ width: 140 }}>
            <InputNumber min={0} step={1000} />
          </Form.Item>
          <Form.Item label="Inscripción" name="inscripcion" style={{ width: 140 }}>
            <InputNumber min={0} step={1000} />
          </Form.Item>
          <Form.Item label="Reserva" name="reserva" style={{ width: 140 }}>
            <InputNumber min={0} step={1000} />
          </Form.Item>
          <Form.Item label="Primera cuota" name="primera_cuota" style={{ width: 140 }}>
            <InputNumber min={0} step={1000} />
          </Form.Item>
          <Form.Item label="Anticipo saldo" name="anticipo_saldo" style={{ width: 140 }}>
            <InputNumber min={0} step={1000} />
          </Form.Item>
          <Form.Item label="Total final" name="total_final" style={{ width: 140 }}>
            <InputNumber min={0} step={1000} />
          </Form.Item>
          <Form.Item label="Vigencia" name="vigencia" style={{ width: 200 }}>
            <Input />
          </Form.Item>
        </Space>
        <Form.Item label="Actividades (separadas por coma)" name="actividades">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Space size="middle" style={{ display: "flex" }} wrap>
          <Form.Item label="Liberados" name="liberados" style={{ flex: 1, minWidth: 200 }}>
            <Input />
          </Form.Item>
          <Form.Item label="Seguro" name="seguro" style={{ flex: 1, minWidth: 200 }}>
            <Input />
          </Form.Item>
          <Form.Item label="Descuentos" name="descuentos" style={{ flex: 1, minWidth: 200 }}>
            <Input />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
