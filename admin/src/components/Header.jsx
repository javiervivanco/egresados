import React from "react";
import { Layout, Space, Typography, Avatar, Dropdown, Button } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { EmpresaSwitcher } from "./EmpresaSwitcher";

const { Text } = Typography;

export const Header = () => {
  const { data: identity } = useGetIdentity();
  const { mutate: logout } = useLogout();

  if (!identity) return null;

  const menu = {
    items: [
      {
        key: "logout",
        label: "Cerrar sesión",
        icon: <LogoutOutlined />,
        onClick: () => logout(),
      },
    ],
  };

  return (
    <Layout.Header style={{ background: "#fff", padding: "0 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
      <Space size="middle">
        {identity.rol === "super_admin" && <EmpresaSwitcher />}
        <Dropdown menu={menu} trigger={["click"]}>
          <Space style={{ cursor: "pointer" }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#2D5A27" }} />
            <Space direction="vertical" size={0}>
              <Text strong style={{ lineHeight: 1.2 }}>{identity.name}</Text>
              <Text type="secondary" style={{ fontSize: 11, lineHeight: 1 }}>
                {identity.rol}{identity.empresa_nombre ? ` · ${identity.empresa_nombre}` : ""}
              </Text>
            </Space>
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  );
};
