"use client";

import React from "react";

export function Legend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#9fb3c8", fontSize: 12 }}>Low</span>
      <div
        style={{
          width: 160,
          height: 10,
          borderRadius: 6,
          background: "linear-gradient(90deg,#1b2b33,#3cab6c,#ffd166,#f94144)",
        }}
      />
      <span style={{ color: "#9fb3c8", fontSize: 12 }}>High</span>
    </div>
  );
}

