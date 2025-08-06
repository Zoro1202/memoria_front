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
      // 1. 화면 공유(화면/창/탭+오디오(시스템 사운드)) 스트림 요청
      let screenStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        // 사용자가 화면공유를 아예 취소하면 이 쪽으로
        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          alert("화면 공유를 선택하거나 권한을 허용해야 녹화가 시작됩니다.");
        } else {
          alert("화면 공유 시작 중 오류가 발생했습니다: " + err.message);
        }
        setIsRecording(false);
        return;
      }

      // 2. 마이크 스트림 시도 (없어도 무조건 녹화 진행)
      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        // 마이크 없으면 경고만, 녹화는 계속 진행
        console.warn("마이크 없음 또는 권한 거부, 마이크 소리 없이 녹화 진행.", err);
      }

      // 3. 모든 트랙 합치기
      const tracks = [
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks()
      ];
      if (micStream) {
        tracks.push(...micStream.getAudioTracks());
      }
      const mixedStream = new MediaStream(tracks);
      mixedStreamRef.current = mixedStream;

      // 4. MediaRecorder 지원 포맷 찾기
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
      ];
      let mediaRecorder = null;
      for (let type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mediaRecorder = new MediaRecorder(mixedStream, { mimeType: type, bitsPerSecond: 2500000 });
          break;
        }
      }
      if (!mediaRecorder) {
        alert("이 브라우저에서 지원하는 녹화 포맷이 없습니다.");
        setIsRecording(false);
        return;
      }

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

      // UI 안내(선택)
      if (!micStream) {
        alert("마이크 소리가 없는 화면 녹화가 시작되었습니다.\n(화면/탭/창 사운드만 녹음됩니다)");
      }
    } catch (error) {
      console.error("녹화 시작 실패:", error);
      if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        alert("화면 공유를 선택하거나 권한을 허용해야 녹화가 시작됩니다.");
      } else {
        alert("녹화 시작 중 오류가 발생했습니다: " + error.message);
      }
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
