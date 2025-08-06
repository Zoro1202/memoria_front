import React, { useState, useRef, useEffect } from 'react';
import './VoiceSampleModal.css';
import { verifyVoiceSample } from '../../Components/Note/note_AIassist';
import { toast } from 'react-hot-toast';

const scriptLines = [
  "좋은 아침입니다. 오늘은 기분 좋은 하루가 될 것 같아요.",
  "창밖을 보니 햇살이 따뜻하게 비치고 바람도 상쾌하게 느껴집니다.",
  "아침 식사로 따뜻한 국과 밥을 먹으니 힘이 나는 것 같아요.",
  "잠시 후에는 산책을 하면서 주변 풍경을 감상해 볼까 합니다.",
  "카페에 들러서 커피 한 잔을 주문하고 조용히 책을 읽는 시간도 기대돼요.",
  "하루 동안 여러 사람과 대화를 나누고 새로운 경험을 쌓을 생각에 설렙니다.",
  "오늘도 모두 건강하고 행복한 하루 보내시길 바랍니다."
];

const MAX_TIME = 60000;  // 1분 제한 (60초)

function formatTime(ms) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms / 1000) % 60);
  const tenth = Math.floor((ms % 1000) / 100);
  return `${min}:${sec.toString().padStart(2, '0')}.${tenth}`;
}

const AccuracyBar = ({ score }) => {
  const color = score >= 90 ? '#10b981' : score > 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="accuracy-bar-container">
      <div className="accuracy-bar-fill" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
};

function VoiceSampleModal({ isOpen, onClose, subjectId, onUploadSuccess }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const resetState = () => {
    setError('');
    setIsRecording(false);
    setAudioBlob(null);
    setSelectedFile(null);
    setRecordTime(0);
    setLoading(false);
    setVerificationResult(null);
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
    return () => clearInterval(timerRef.current);
  }, [isOpen]);

  const handleStartRecording = async () => {
    resetState();
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        setError('이 브라우저는 녹음 기능을 지원하지 않습니다.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev + 100 >= MAX_TIME) {
            handleStopRecording();
            setError('최대 녹음 시간(1분)에 도달하여 자동으로 녹음이 중지되었습니다.');
            return MAX_TIME;
          }
          return prev + 100;
        });
      }, 100);
    } catch (err) {
      setError('마이크 권한이 필요합니다: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileChange = (e) => {
    resetState();
    setSelectedFile(e.target.files[0] ?? null);
  };

  const handleVerification = async () => {
    const audioFile = selectedFile || audioBlob;
    if (!audioFile) {
      setError('검증할 오디오 파일이 없습니다.');
      return;
    }
    setLoading(true);
    setError('');
    setVerificationResult(null);
    abortControllerRef.current = new AbortController();
    const toastId = toast.loading('음성 샘플을 검증하고 있습니다...');

    try {
      const result = await verifyVoiceSample(audioFile, scriptLines.join('\n'), abortControllerRef.current.signal);
      setVerificationResult(result);
      if (result.score < 90) {
        setError("화자 분리 정확도가 낮습니다. 녹음은 1분 이내로만 가능하니, 다시 녹음해 주세요.");
        toast.error('정확도가 낮아 저장할 수 없습니다.', { id: toastId });
      } else {
        toast.success('검증이 완료되었습니다.', { id: toastId });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || '검증에 실패했습니다.');
        toast.error(`검증 실패: ${err.message}`, { id: toastId });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleUpload = async () => {
    const fileToUpload = selectedFile || audioBlob;
    if (!fileToUpload || !subjectId) {
      setError('업로드할 파일 또는 사용자 정보가 없습니다.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('음성 샘플을 저장하는 중...');
    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('audio', fileToUpload);

    try {
      const res = await fetch('https://stt.memoriatest.kro.kr/api/voice-sample/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      toast.success('음성 샘플이 성공적으로 저장되었습니다.', { id: toastId });
      if (onUploadSuccess) onUploadSuccess(data.voicePath);
      onClose();
    } catch (err) {
      setError(err.message || '업로드 실패');
      toast.error(`저장 실패: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDuringLoading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    toast.dismiss();
  };

  if (!isOpen) return null;

  return (
    <div className="voice-sample-modal-overlay" onClick={onClose}>
      <div className="voice-sample-modal-content" onClick={e => e.stopPropagation()}>
        <h3>음성 샘플 등록</h3>

        {loading ? (
          <div className="loader">
            검증 중...
            <button onClick={handleCancelDuringLoading} className="modal-close-btn" style={{marginTop: '16px'}}>취소</button>
          </div>
        ) : verificationResult ? (
          // Verification Result View
          <div className="verification-result-container">
            <h4>검증 결과</h4>
            <div className="accuracy-summary">
              <span className="accuracy-score" style={{ color: verificationResult.score >= 90 ? '#10b981' : verificationResult.score > 60 ? '#f59e0b' : '#ef4444' }}>
                {verificationResult.score.toFixed(1)}%
              </span>
              <span className="accuracy-label">일치</span>
            </div>
            <AccuracyBar score={verificationResult.score} />
            {error && <p className="error-message">{error}</p>}
            {verificationResult.score >= 90 ? (
              <button onClick={handleUpload} className="save-btn">저장</button>
            ) : (
              <button onClick={onClose} className="close-btn">닫기</button>
            )}
          </div>
        ) : (
          // Initial View
          <>
            <button
              className={`record-btn${isRecording ? ' recording' : ''}`}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              type="button"
            >
              {isRecording ? '녹음 중지' : '녹음 시작'}
            </button>

            <div className="recording-time">
              {isRecording ? `⏱️ 녹음 중: ${formatTime(recordTime)}` : (audioBlob ? `녹음 길이: ${formatTime(recordTime)}` : '\u00A0')}
            </div>

            {audioBlob && !selectedFile && (
              <div style={{ marginBottom: 12 }}>
                <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: '100%' }} />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <input
                type="file"
                accept="audio/*"
                ref={fileInputRef}
                id="voice-file-input"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <label htmlFor="voice-file-input" className="file-select-btn" tabIndex={0}>
                파일 선택
              </label>
              <div className="selected-file-name">
                {selectedFile ? selectedFile.name : '선택된 파일 없음'}
              </div>
            </div>

            <div className="transcript-section">
              <label>대본 예시</label>
              <div className="transcript-text">
                {scriptLines.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>

            {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}

            <div className="modal-actions-grid">
              <button
                className="verify-btn"
                onClick={handleVerification}
                disabled={!audioBlob && !selectedFile}
                type="button"
              >
                정확도 검증
              </button>
            </div>
            <button className="close-btn" onClick={onClose} type="button">닫기</button>
          </>
        )}
      </div>
    </div>
  );
}

export default VoiceSampleModal;
