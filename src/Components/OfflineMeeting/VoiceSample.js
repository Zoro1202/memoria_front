import React from "react";

export default function VoiceSampleDisplay({ name, sampleUrl }) {
  if (!sampleUrl) {
    return (
      <p style={{ fontSize: "0.85rem", color: "gray" }}>
        💬 {name || "사용자"}의 음성 샘플이 없습니다.
      </p>
    );
  }
  return (
    <div style={{ marginTop: 4 }}>
      <p style={{ fontSize: "0.85rem" }}>
        🎤 {name || "사용자"}의 음성 샘플:
      </p>
      <audio controls preload="none" style={{ width: '100%' }}>
        <source src={sampleUrl} type="audio/wav" />
        브라우저가 오디오를 지원하지 않습니다.
      </audio>
    </div>
  );
}
