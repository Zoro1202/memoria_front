import React, { useState, useRef, useEffect } from 'react';

const VoiceSampleModal = ({ isOpen, onClose, subjectId, onUploadSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (!isOpen) {
      setTranscript('');
      setIsRecording(false);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    }
  }, [isOpen]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('마이크 권한이 필요합니다.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 녹음된 오디오를 서버에 업로드하는 함수 (필요시)
  const handleUpload = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    formData.append('subject_id', subjectId);

    try {
      const res = await fetch('/api/voice-sample/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setTranscript('업로드 성공!');
        if (onUploadSuccess) onUploadSuccess(json.voicePath);
        onClose();
      } else {
        setTranscript('업로드 실패');
      }
    } catch (e) {
      setTranscript('네트워크 오류');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="voice-sample-modal-overlay" onClick={onClose}>
      <div className="voice-sample-modal-content" onClick={e => e.stopPropagation()}>
        <h3>음성 샘플 녹음</h3>
        <button onClick={isRecording ? handleStopRecording : handleStartRecording}>
          {isRecording ? '녹음 중지' : '녹음 시작'}
        </button>
        <div>
          <label>대본 예시</label>
          <div style={{ padding: 8, backgroundColor: '#eee', margin: '8px 0' }}>
            여기에 대본 텍스트가 표시됩니다.
          </div>
        </div>
        {transcript && <p>{transcript}</p>}
        <button onClick={onClose}>닫기</button>
      </div>
    </div>
  );
};

export default VoiceSampleModal;
