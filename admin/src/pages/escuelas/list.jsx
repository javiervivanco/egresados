import React, { useState } from "react";
import { List, useTable, EditButton, DeleteButton, useModalForm } from "@refinedev/antd";
import { useCreate, useUpdate, useDelete } from "@refinedev/core";
import { Table, Space, Button, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

// Escuelas con grupos nested vía expandable. CRUD de grupos inline con Modal.
export const EscuelasList = () => {
  const { tableProps, tableQuery } = useTable({
    resource: "escuelas",
    meta: { select: "*, grupos(id, anio_egreso, grado, estado, escuela_id)" },
    sorters: { initial: [{ field: "nombre", order: "asc" }] },
  });

  return (
    <List>
      <Table
        {...tableProps}
        rowKey="id"
        expandable={{
          expandedRowRender: (escuela) => (
            <GruposNested
              escuelaId={escuela.id}
              grupos={escuela.grupos || []}
              onChange={() => tableQuery.refetch()}
            />
          ),
        }}
      >
        <Table.Column dataIndex="nombre" title="Nombre" />
        <Table.Column
          title="Ubicación"
          render={(_, r) => [r.localidad, r.provincia].filter(Boolean).join(", ") || "—"}
        />
        <Table.Column
          title="Grupos"
          align="right"
          render={(_, r) => r.grupos?.length || 0}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

function GruposNested({ escuelaId, grupos, onChange }) {
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { mutate: createGrupo } = useCreate();
  const { mutate: updateGrupo } = useUpdate();
  const { mutate: deleteGrupo } = useDelete();

  const submit = (values) => {
    if (editing) {
      updateGrupo(
        { resource: "grupos", id: editing.id, values },
        { onSuccess: () => { setEditing(null); onChange(); } },
      );
    } else {
      createGrupo(
        { resource: "grupos", values: { ...values, escuela_id: escuelaId } },
        { onSuccess: () => { setCreating(false); onChange(); } },
      );
    }
  };

  return (
    <div style={{ padding: "0 24px" }}>
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
          Nuevo grupo
        </Button>
      </Space>
      <Table dataSource={grupos} rowKey="id" pagination={false} size="small">
        <Table.Column dataIndex="grado" title="Grado" />
        <Table.Column dataIndex="anio_egreso" title="Año egreso" />
        <Table.Column
          dataIndex="estado"
          title="Estado"
          render={(v) => <Tag color={v === "activo" ? "green" : "default"}>{v}</Tag>}
        />
        <Table.Column
          title=""
          render={(_, g) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(g)} />
              <Popconfirm
                title="¿Eliminar grupo y todas sus familias?"
                onConfirm={() => deleteGrupo({ resource: "grupos", id: g.id }, { onSuccess: onChange })}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        />
      </Table>
      <GrupoModal
        open={creating || !!editing}
        initial={editing}
        onCancel={() => { setCreating(false); setEditing(null); }}
        onOk={submit}
      />
    </div>
  );
}

function GrupoModal({ open, initial, onCancel, onOk }) {
  const [form] = Form.useForm();

  // Reset al abrir
  React.useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(initial || { estado: "activo", anio_egreso: new Date().getFullYear() + 1 });
    }
  }, [open, initial, form]);

  return (
    <Modal
      open={open}
      title={initial ? "Editar grupo" : "Nuevo grupo"}
      onCancel={onCancel}
      onOk={() => form.validateFields().then((v) => onOk(v))}
      okText={initial ? "Guardar" : "Crear"}
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Grado" name="grado" rules={[{ required: true }]}>
          <Input placeholder="Ej: 6to A" />
        </Form.Item>
        <Form.Item label="Año egreso" name="anio_egreso" rules={[{ required: true }]}>
          <InputNumber min={2024} max={2050} />
        </Form.Item>
        <Form.Item label="Estado" name="estado">
          <Select options={[{ value: "activo" }, { value: "cerrado" }]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
