import React, { useState, useRef } from 'react';
import './css/FileUploadSTT.css';
import { useGroups } from '../../Contexts/GroupContext';

// 모달 컴포넌트
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

export default function FileUploadSTT({ selectedSpeakerInfos }) {
  const { selectedGroupId } = useGroups();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('ko');
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [modalResult, setModalResult] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const isLoadingRef = useRef(false);

  const fetchWithTimeout = (url, options, timeout = 600000) => {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
        reject(new Error('요청이 시간초과 되었습니다.'));
      }, timeout);

      fetch(url, { ...options, signal: controller.signal })
        .then(response => {
          clearTimeout(timer);
          resolve(response);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  // 파일 업로드 후 STT 변환
  const handleUpload = async () => {
    if (!file || selectedSpeakerInfos.length === 0) {
      setError('파일과 화자를 모두 설정해야 합니다.');
      return;
    }
    setError('');
    setModalOpen(true);
    setModalStatus('변환 중입니다... 잠시만 기다려 주세요.');
    setModalResult('');
    setModalLoading(true);
    setModalInput('');
    isLoadingRef.current = true;

    const sampleIds = selectedSpeakerInfos.map(info => info.subject_id);
    const speakerNames = {};
    selectedSpeakerInfos.forEach(({ name }, i) => {
      speakerNames[(i + 1).toString()] = name;
    });

    const formData = new FormData();
    formData.append('file', file);
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
    } finally {
      isLoadingRef.current = false;
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

  return (
    <>
      <div className="file-upload-stt-box">
        <h4>📁 음성 파일 업로드</h4>
        <input
          type="file"
          accept="audio/*"
          className="file-upload-input"
          onChange={e => setFile(e.target.files[0])}
        />
        <select
          className="file-lang-select"
          value={lang}
          onChange={e => setLang(e.target.value)}
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
        <button
          className="file-stt-button"
          onClick={handleUpload}
        >
          변환 시작
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>

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
    </>
  );
}
