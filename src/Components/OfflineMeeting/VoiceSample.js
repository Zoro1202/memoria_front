import React from "react";

export default function VoiceSampleDisplay({ nickname, sampleUrl }) {
  if (!sampleUrl) {
    return (
      <p style={{ fontSize: "0.85rem", color: "gray" }}>
        💬 {nickname || '사용자'}의 샘플 없음
      </p>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <p style={{ fontSize: 12 }}>{nickname}의 샘플:</p>
      <audio controls preload="none" style={{ width: '100%' }}>
        <source src={sampleUrl} type="audio/wav" />
        브라우저가 오디오를 지원하지 않습니다.
      </audio>
    </div>
  );
}
