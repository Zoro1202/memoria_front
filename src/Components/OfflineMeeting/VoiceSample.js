import React from "react";
import "./css/VoiceSample.css";

export default function VoiceSampleDisplay({ name, sampleUrl }) {
  if (!sampleUrl) {
    return (
      <p className="voice-sample-label" style={{ color: "gray" }}>
        💬 {name || "사용자"}의 음성 샘플이 없습니다.
      </p>
    );
  }
  return (
    <div className="voice-sample-box">
      <p className="voice-sample-label">
        🎤 {name || "사용자"}의 음성 샘플:
      </p>
      <audio
        controls
        preload="none"
        className="voice-sample-audio"
      >
        <source src={sampleUrl} type="audio/wav" />
        브라우저가 오디오를 지원하지 않습니다.
      </audio>
    </div>
  );
}
