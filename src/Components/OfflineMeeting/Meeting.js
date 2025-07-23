import React, { useState } from "react";
import GroupSelect from "./GroupSelect";
import FileUploadSTT from "./FileUploadSTT";
import RecordSTT from "./RecordSTT";

export default function Meeting() {
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState([]);
  const [mode, setMode] = useState("file");

  return (
    <div>
      <h2>오프라인 회의</h2>
      <div>
        <button onClick={() => setMode("file")}>파일 업로드</button>
        <button onClick={() => setMode("mic")}>마이크 녹음</button>
      </div>
      <GroupSelect onSelectionChange={setSelectedSpeakerIds} />
      {mode === "file" && <FileUploadSTT selectedSpeakerIds={selectedSpeakerIds} />}
      {mode === "mic" && <RecordSTT selectedSpeakerIds={selectedSpeakerIds} />}
    </div>
  );
}
