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

const MAX_TIME = 60000;

function formatTime(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms / 1000) % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

const VIEW_STATE = {
  INITIAL: 'initial',
  LOADING: 'loading',
  VERIFICATION_RESULT: 'verification_result',
};

// SVG 아이콘 컴포넌트
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="result-icon success">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ExclamationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="result-icon error">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);


const AccuracyBar = ({ score }) => {
  const isSuccess = score >= 95;  // 기준 점수 95%로 변경
  const color = isSuccess ? '#10b981' : '#ef4444';
  return (
    <div className="accuracy-bar-container">
      <div className="accuracy-bar-fill" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
};

function VoiceSampleModal({ isOpen, onClose, subjectId, onUploadSuccess }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [currentView, setCurrentView] = useState(VIEW_STATE.INITIAL);


  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const resetState = (keepFile = false) => {
    setError('');
    setIsRecording(false);
    setAudioBlob(null);
    if (!keepFile) {
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
    setRecordTime(0);
    setVerificationResult(null);
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    setCurrentView(VIEW_STATE.INITIAL);
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => resetState(false), 300); // 모달 닫기 애니메이션 후 리셋
    }
    return () => clearInterval(timerRef.current);
  }, [isOpen]);

  const handleStartRecording = async () => {
    resetState();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordTime(prev => {
        if (prev + 100 >= MAX_TIME) {
          handleStopRecording();
          toast.error('최대 녹음 시간(1분)에 도달했습니다.');
          return MAX_TIME;
        }
        return prev + 100;
      }), 100);
    } catch (err) {
      setError('마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
  if (audioBlob) {
    const url = URL.createObjectURL(audioBlob);
    setAudioURL(url);
    return () => {
      URL.revokeObjectURL(url);
      setAudioURL('');
    };
  } else {
    setAudioURL('');
  }
}, [audioBlob]);

 const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL('');
    }
    setAudioBlob(file);
    setSelectedFile(file);
    setRecordTime(0);
    setError('');
  }
  if (fileInputRef.current) fileInputRef.current.value = "";
};

  const handleVerification = async () => {
    const audioFile = selectedFile || audioBlob;
    if (!audioFile) {
      setError('검증할 오디오가 없습니다.');
      return;
    }
    setError('');
    setVerificationResult(null);
    setCurrentView(VIEW_STATE.LOADING);
    abortControllerRef.current = new AbortController();

    try {
      const result = await verifyVoiceSample(audioFile, scriptLines.join('\n'), abortControllerRef.current.signal);
      setVerificationResult(result);
      if (result.score < 95) {
        setError("화자 분리 정확도가 기준(95%)에 미치지 못했습니다. 다른 환경에서 다시 녹음하거나 다른 파일을 사용해 주세요.");
      }
      setCurrentView(VIEW_STATE.VERIFICATION_RESULT);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || '검증 중 오류가 발생했습니다.');
        setCurrentView(VIEW_STATE.INITIAL);
      }
    } finally {
      if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
        // 이미 handleCancelDuringLoading에서 처리하므로 여기서는 추가 작업 불필요
      }
      abortControllerRef.current = null;
    }
  };

  const handleUpload = async () => {
    const fileToUpload = selectedFile || audioBlob;
    if (!fileToUpload || !subjectId) {
        toast.error('업로드할 파일 또는 사용자 정보가 없습니다.');
        return;
    }
    
    const toastId = toast.loading('음성 샘플을 저장하고 있습니다...');
    
    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('audio', fileToUpload, selectedFile ? selectedFile.name : 'recording.webm');
    
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
        toast.error(`저장 실패: ${err.message || '알 수 없는 오류'}`, { id: toastId });
    }
  };

  const handleCancelDuringLoading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.dismiss();
      toast('검증이 취소되었습니다.');
      setCurrentView(VIEW_STATE.INITIAL); // 취소 후 초기 화면으로
    }
  };

  // [추가] 모달을 닫는 통합 핸들러
  const handleClose = () => {
    // 로딩 중일 때 닫기를 시도하면, 진행 중인 작업을 취소
    if (currentView === VIEW_STATE.LOADING && abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.dismiss();
      toast('검증이 취소되었습니다.');
    }
    onClose(); // 부모 컴포넌트에 닫기 이벤트 전달
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (currentView) {
      case VIEW_STATE.LOADING:
        return (
          <div className="view-container loading-view">
            <div className="loading-spinner"></div>
            <p className="loading-text">음성 샘플을 분석 중입니다...</p>
            <p className="loading-subtext">최대 1분 정도 소요될 수 있습니다.</p>
            <button onClick={handleCancelDuringLoading} className="cancel-loading-btn">취소</button>
          </div>
        );

      case VIEW_STATE.VERIFICATION_RESULT:
        if (!verificationResult) return null;
        const isSuccess = verificationResult.score >= 95;
        return (
          <div className="view-container verification-result-view">
            {isSuccess ? <CheckIcon /> : <ExclamationIcon />}
            <h4 className="result-title">검증 결과</h4>
            <div className="accuracy-summary">
              <span className={`accuracy-score ${isSuccess ? 'success' : 'error'}`}>
                {verificationResult.score.toFixed(1)}%
              </span>
              <span className="accuracy-label">일치</span>
            </div>
            <AccuracyBar score={verificationResult.score} />
            {error && <p className="error-message">{error}</p>}
            <div className="result-actions">
              {isSuccess ? (
                <button onClick={handleUpload} className="action-btn save-btn">
                  이 음성으로 저장
                </button>
              ) : (
                <button onClick={() => resetState(true)} className="action-btn retry-btn">
                  다시 시도
                </button>
              )}
            </div>
          </div>
        );

      case VIEW_STATE.INITIAL:
      default:
        return (
          <div className="view-container initial-view">
            <div className="input-section">
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
              >
                <span className="record-icon-wrapper">
                  <span className="record-icon"></span>
                </span>
                {isRecording ? '녹음 중지' : '녹음 시작'}
              </button>
              <div className="recording-time">
                {isRecording ? `녹음 시간: ${formatTime(recordTime)}` : (audioBlob ? `녹음 완료: ${formatTime(recordTime)}` : '')}
              </div>
              {audioURL && <audio controls src={audioURL} className="audio-preview" />}
              <div className="divider-or">또는</div>
              <div className="file-input-group">
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  ref={fileInputRef}
                  id="voice-file-input"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <label htmlFor="voice-file-input" className="file-select-btn">
                  파일 업로드
                </label>
                <span className="selected-file-name">
                  {selectedFile ? selectedFile.name : '선택된 파일 없음'}
                </span>
              </div>
            </div>

            <div className="transcript-section">
              <label>대본 예시 (아래 내용을 녹음해 주세요)</label>
              <div className="transcript-text">
                {scriptLines.map((line, idx) => <p key={idx}>{line}</p>)}
              </div>
            </div>

            {error && <p className="error-message initial-error">{error}</p>}

            <div className="modal-actions-grid">
              {/* [수정] 닫기 버튼에 새로운 핸들러 적용 */}
              <button className="action-btn-secondary" onClick={handleClose}>닫기</button>
              <button
                className="action-btn-primary"
                onClick={handleVerification}
                disabled={!audioBlob && !selectedFile}
              >
                정확도 검증
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    // [수정] 오버레이 클릭 시 handleClose 호출
    <div className="voice-sample-modal-overlay" onClick={handleClose}>
      <div className="voice-sample-modal-content" onClick={e => e.stopPropagation()}>
        <h3>음성 샘플 등록</h3>
        {renderContent()}
      </div>
    </div>
  );
};

export default VoiceSampleModal;