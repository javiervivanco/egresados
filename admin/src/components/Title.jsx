import React from "react";
import { Link } from "react-router";
import { Typography } from "antd";

export const Title = ({ collapsed }) => (
  <Link to="/" style={{ display: "flex", alignItems: "center", padding: "16px 12px", color: "#2D5A27", textDecoration: "none" }}>
    <Typography.Title level={5} style={{ margin: 0, color: "#2D5A27", fontWeight: 700 }}>
      {collapsed ? "EA" : "Egresados · Admin"}
    </Typography.Title>
  </Link>
);
