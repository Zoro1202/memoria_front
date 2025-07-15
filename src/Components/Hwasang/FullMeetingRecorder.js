import React, { useRef, useState } from "react";
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';

function FullMeetingRecorder({ roomId }) {
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const mixedStreamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mixedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
        ...micStream.getAudioTracks(),
      ]);
      mixedStreamRef.current = mixedStream;

      const mediaRecorder = new MediaRecorder(mixedStream, {
        mimeType: "video/webm;codecs=vp9,opus",
        bitsPerSecond: 2500000,
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        await uploadRecording(blob);
        mixedStreamRef.current.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error("녹화 시작 실패:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // roomId를 반드시 함께 전송!
  const uploadRecording = async (blob) => {
    try {
      const formData = new FormData();
      console.log("roomid", roomId);
      formData.append("video", blob, `recording_${Date.now()}.webm`);
      formData.append("roomId", roomId);
      const response = await fetch("https://hwasang.memoriatest.kro.kr/api/upload-recording", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        console.log("업로드 성공:", result);
        alert("녹화 파일이 서버에 업로드되었습니다!");
      } else {
        throw new Error("서버 업로드 실패");
      }
    } catch (error) {
      console.error("업로드 오류:", error);
      alert("업로드에 실패했습니다: " + error.message);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Tooltip title={isRecording ? "녹화 종료" : "녹화 시작"}>
      <IconButton
        color={isRecording ? "error" : "primary"}
        onClick={handleToggleRecording}
        size="large"
      >
        {isRecording ? <StopScreenShareIcon /> : <FiberManualRecordIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default FullMeetingRecorder;
