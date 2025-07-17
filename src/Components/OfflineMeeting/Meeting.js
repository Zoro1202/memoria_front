import React, { useState } from "react";
import MemberSelect from "./MemberSelect";
import FileUploadSTT from "./FileUploadSTT";
import MicRecordSTT from "./RecordSTT";

export default function OfflineMeeting() {
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState([]);
  const [mode, setMode] = useState("file"); // or 'mic'

  return (
    <div style={{ padding: 24 }}>
      <h2>오프라인 회의</h2>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setMode("file")}>📁 파일 업로드</button>
        <button onClick={() => setMode("mic")} style={{ marginLeft: 10 }}>
          🎙 마이크 녹음
        </button>
      </div>

      {/* 멤버 선택 UI */}
      <MemberSelect onSelectionChange={setSelectedSpeakerIds} />

      <hr />

      {mode === "file" && (
        <FileUploadSTT selectedSpeakerIds={selectedSpeakerIds} />
      )}
      {mode === "mic" && (
        <MicRecordSTT selectedSpeakerIds={selectedSpeakerIds} />
      )}
    </div>
  );
}
