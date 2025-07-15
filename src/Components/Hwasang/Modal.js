import React from "react";

export default function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          minWidth: 400,
          maxWidth: "95vw",
          maxHeight: "90vh",
          width: "auto",
          overflow: "auto",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          style={{
            position: "absolute", top: 8, right: 8, background: "none",
            border: "none", fontSize: 28, cursor: "pointer", lineHeight: 1
          }}
          onClick={onClose}
        >×</button>
        {children}
      </div>
    </div>
  );
}
