import React, { useState } from 'react';
import GroupSelect from './GroupSelect';
import FileUploadSTT from './FileUploadSTT';
import RecordSTT from './RecordSTT';
import './css/Meeting.css';

// ── 모달 오버레이 컴포넌트 (내부에 두어도 상관 없음) ──
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        zIndex: 2000,
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.23)',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}
      onClick={e => { if (e.target.className === "modal-overlay") onClose(); }}
    >
      <div
        className="modal-content"
        style={{
          background: '#fff',
          borderRadius: '18px',
          padding: 0,
          maxWidth: 480,
          width: '95vw',
          maxHeight: '92vh',
          boxShadow: '0 2px 34px rgba(0,0,0,0.21)',
          overflowY: 'auto',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
        <button
          className="modal-close-btn"
          onClick={onClose}
          style={{
            background: '#355be7',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            borderRadius: 8,
            padding: '8px 28px',
            margin: '24px auto 18px auto',
            display: 'block'
          }}
        >닫기</button>
      </div>
    </div>
  );
}

// ── 오프라인 회의 메인 컴포넌트 ──
export default function MeetingPage({ open, onClose }) {
  const [mode, setMode] = useState('file'); // 'file' or 'mic'
  const [selectedSpeakerInfos, setSelectedSpeakerInfos] = useState([]);

  const content = (
    <div className="meeting-bg">
      <div className="meeting-card">
        <div className="meeting-title">오프라인 회의</div>
        <div className="meeting-mode-bar">
          <button
            className={'meeting-mode-btn' + (mode === 'file' ? ' selected' : '')}
            onClick={() => setMode('file')}
          >
            파일 업로드
          </button>
          <button
            className={'meeting-mode-btn' + (mode === 'mic' ? ' selected' : '')}
            onClick={() => setMode('mic')}
          >
            마이크 녹음
          </button>
        </div>
        <GroupSelect onSelectionChange={setSelectedSpeakerInfos} />
        {mode === 'file' && (
          <FileUploadSTT selectedSpeakerInfos={selectedSpeakerInfos} />
        )}
        {mode === 'mic' && (
          <RecordSTT selectedSpeakerIds={selectedSpeakerInfos} />
        )}
      </div>
    </div>
  );

  // ── open, onClose props 존재 시 모달 래핑 (단독 사용시엔 기존처럼 랜더됨)
  if (open !== undefined && typeof onClose === 'function') {
    return <Modal open={open} onClose={onClose}>{content}</Modal>;
  }
  return content;
}
