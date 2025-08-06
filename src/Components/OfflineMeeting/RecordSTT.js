import React, { useRef, useState } from 'react';
import "./css/RecordSTT.css";

export default function RecordSTT({ selectedSpeakerIds }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState('ko');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleStart = async () => {
    setError(''); setResult('');
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        setError('이 브라우저는 녹음 기능을 지원하지 않습니다.'); return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recorded_${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFile(file);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('마이크 접근 실패: ' + err.message);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const fetchWithTimeout = (url, options, timeout = 600000) => {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort(); reject(new Error('요청이 시간초과 되었습니다.'));
      }, timeout);

      fetch(url, { ...options, signal: controller.signal })
        .then(response => { clearTimeout(timer); resolve(response); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  };

  const handleTranscribe = async () => {
    setError(''); setResult('');
    if (!audioFile || !selectedSpeakerIds === 0) {
      setError('녹음 파일과 화자를 모두 선택하세요.'); return;
    }
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('lang', lang);
    selectedSpeakerIds.forEach((id) => {
      formData.append('sample_ids', id);
    });
    const speakerNames = {};
    selectedSpeakerIds.forEach((id, idx) => {
      speakerNames[idx + 1] = `화자${idx + 1}`;
    });
    formData.append('speaker_names', JSON.stringify(speakerNames));
    try {
      const res = await fetchWithTimeout('/transcribe', {
        method: 'POST',
        body: formData
      }, 600000);
      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const errorData = await res.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch {}
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setResult(data.transcript);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="record-stt-box">
      <h4>🎙 마이크 녹음 STT</h4>
      <button
        className={`record-stt-mainbtn${isRecording ? " active" : ""}`}
        onClick={isRecording ? handleStop : handleStart}
      >
        {isRecording ? '녹음 중지' : '녹음 시작'}
      </button>
      <br /><br />
      {audioFile && (
        <div className="record-stt-file-info">
          녹음 파일: {audioFile.name}
          <audio controls src={URL.createObjectURL(audioFile)} style={{ width: '100%' }} />
        </div>
      )}
      <label>
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
      <br /><br />
      <button
        className="record-stt-transcribe-btn"
        onClick={handleTranscribe}
        disabled={!audioFile || !selectedSpeakerIds === 0}
      >
        화자분리+STT 변환
      </button>
      {error && <p className="record-stt-error"><b>{error}</b></p>}
      {result && <pre style={{ marginTop: 16, background: '#f5f5f5', padding: 12 }}>{result}</pre>}
    </div>
  );
}
