import React from "react";

export default function VoiceSampleDisplay({ nickname, sampleUrl }) {
  if (!sampleUrl) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <p style={{ margin: 0, fontSize: 12 }}>{nickname}의 샘플:</p>
      <audio controls src={sampleUrl} style={{ width: "100%" }} />
    </div>
  );
}
