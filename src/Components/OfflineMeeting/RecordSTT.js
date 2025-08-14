import React, { useState, useRef, useEffect } from 'react';
import { useGroups } from '../../Contexts/GroupContext';
import './css/RecordSTT.css';

function Modal({ open, onClose, status, result, loading, inputValue, setInputValue, onSave }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target.className === 'modal-overlay') onClose(); }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-status">{status}</div>
        {loading ? (
          <div className="modal-loading-wrapper">
            <div className="modal-spinner"></div>
            <div className="modal-loading-text">변환 중입니다... 잠시만 기다려 주세요.</div>
          </div>
        ) : (
          <>
            <pre className="modal-result">{result}</pre>
            <textarea
              className="modal-textarea"
              placeholder="노트로 저장할 제목을 입력해 주세요..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
            <div className="modal-button-group">
              <button className="modal-save-btn" onClick={onSave}>저장</button>
              <button className="modal-close-btn" onClick={onClose}>닫기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function formatTime(ms) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms / 1000) % 60);
  const tenth = Math.floor((ms % 1000) / 100);
  return `${min}:${sec.toString().padStart(2, '0')}.${tenth}`;
}
export default function RecordSTT({ selectedSpeakerInfos }) {
  const { selectedGroupId } = useGroups();
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('ko');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const [recordTime, setRecordTime] = useState(0);

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [modalResult, setModalResult] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalInput, setModalInput] = useState('');

  const fetchWithTimeout = (url, options, timeout = 600000) => {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
        reject(new Error('요청이 시간초과 되었습니다.'));
      }, timeout);
      fetch(url, { ...options, signal: controller.signal })
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const resetState = () => {
    setError('');
    setIsRecording(false);
    setAudioFile(null);
    setRecordTime(0);
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
  };
  const handleStart = async () => {
    resetState();
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        setError('이 브라우저는 녹음 기능을 지원하지 않습니다.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }
      const mediaRecorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          setError('녹음 데이터가 없습니다. 다시 시도해 주세요.');
          setAudioFile(null);
          clearInterval(timerRef.current);
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        if (blob.size === 0) {
          setError('녹음된 오디오가 비어있습니다.');
          setAudioFile(null);
          clearInterval(timerRef.current);
          return;
        }
        const file = new File([blob], `recorded_${Date.now()}.webm`, { type: blob.type });
        setAudioFile(file);
        clearInterval(timerRef.current);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 100);
      }, 100);
    } catch (err) {
      setError('마이크 접근 실패: ' + err.message);
    }
  };
  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  // STT 변환
  const handleTranscribe = async () => {
    if (!audioFile || !selectedSpeakerInfos || selectedSpeakerInfos.length === 0) {
      setError('파일과 화자 정보를 모두 선택해 주세요.');
      return;
    }
    setError('');
    setModalOpen(true);
    setModalStatus('변환 중입니다... 잠시만 기다려 주세요.');
    setModalResult('');
    setModalLoading(true);
    setModalInput('');

    const sampleIds = selectedSpeakerInfos.map(info => info.subject_id);
    const speakerNames = {};
    selectedSpeakerInfos.forEach(({ name }, i) => {
      speakerNames[(i + 1).toString()] = name;
    });

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('lang', lang);
    sampleIds.forEach(id => formData.append('sample_ids', id));
    formData.append('speaker_names', JSON.stringify(speakerNames));

    try {
      const res = await fetchWithTimeout('/transcribe', {
        method: 'POST',
        body: formData,
      }, 600000);

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setModalLoading(false);
      if (data.success) {
        setModalStatus('변환 완료');
        setModalResult(data.transcript || '(결과 없음)');
      } else {
        setModalStatus('변환 실패');
        setModalResult(data.error || '(오류 발생)');
        setError(data.error || 'STT 변환 실패');
      }
    } catch (err) {
      setModalLoading(false);
      setModalStatus('변환 실패');
      setModalResult(err.message || 'STT 변환 실패');
      setError(err.message || 'STT 변환 실패');
    }
  };

  // 노트 저장
  const handleSave = async () => {
    if (!modalInput || modalInput.trim() === '') {
      alert('노트 제목을 입력해 주세요.');
      return;
    }
    try {
      const noteId = -2;
      const res = await fetch('/api/newUpsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          note_id: noteId,
          title: modalInput,
          content: modalResult,
          group_id: selectedGroupId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        alert('저장 성공');
        setModalStatus('저장 완료');
        setModalOpen(false);
      } else {
        setModalStatus('저장 실패');
        setModalResult(data.error || '(오류 발생)');
        setError(data.error || '저장 실패');
        alert(`저장 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      setModalStatus('저장 실패');
      setModalResult(err.message || '저장 실패');
      setError(err.message || '저장 실패');
      alert(`저장 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  // 녹음 오디오 미리듣기용
  const [audioURL, setAudioURL] = useState('');
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioURL(url);
      return () => {
        URL.revokeObjectURL(url);
        setAudioURL('');
      };
    }
  }, [audioFile]);

  return (
    <>
      <div className="record-stt-box">
        <h4>🎙 마이크 녹음 STT</h4>
        <button
          className={`record-stt-mainbtn${isRecording ? ' active' : ''}`}
          onClick={isRecording ? handleStop : handleStart}
        >
          {isRecording ? '녹음 중지' : '녹음 시작'}
        </button>
        <div className="recording-time" style={{ marginTop: '8px', fontWeight: 'bold' }}>
          {isRecording
            ? `⏱️ 녹음 중: ${formatTime(recordTime)}`
            : audioFile
              ? `녹음 길이: ${formatTime(recordTime)}`
              : '\u00A0'}
        </div>
        {audioFile && (
          <div className="record-stt-file-info" style={{ marginTop: 12 }}>
            녹음 파일: {audioFile.name}
            <audio controls src={audioURL} style={{ width: '100%', marginTop: 8 }} />
          </div>
        )}
        <label style={{ marginTop: 16, display: 'block' }}>
          언어 선택:&nbsp;
          <select
            className="record-lang-dropdown"
            value={lang}
            onChange={e => setLang(e.target.value)}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </label>
        <button
          className="record-stt-transcribe-btn"
          onClick={handleTranscribe}
          style={{ marginTop: 16 }}
        >
          변환 시작
        </button>
        {error && <p className="record-stt-error" style={{ marginTop: 12, color: 'red' }}><b>{error}</b></p>}
        <Modal
          open={isModalOpen}
          onClose={() => setModalOpen(false)}
          status={modalStatus}
          result={modalResult}
          loading={modalLoading}
          inputValue={modalInput}
          setInputValue={setModalInput}
          onSave={handleSave}
        />
      </div>
    </>
  );
}
