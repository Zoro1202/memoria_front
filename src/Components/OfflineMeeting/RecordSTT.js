import React, { useRef, useState } from 'react';

export default function MicRecordSTT({ selectedSpeakerIds }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState('ko');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // 녹음 시작
  const handleStart = async () => {
    setError('');
    setResult('');
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        setError('이 브라우저는 녹음 기능을 지원하지 않습니다.');
        return;
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

  // 녹음 중지
  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // fetch with timeout helper 함수 (중복되므로 별도 util로 분리 권장)
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

  // STT 변환 요청
  const handleTranscribe = async () => {
    setError('');
    setResult('');
    if (!audioFile || selectedSpeakerIds.length === 0) {
      setError('녹음 파일과 화자를 모두 선택하세요.');
      return;
    }
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('lang', lang);

    selectedSpeakerIds.forEach((id, idx) => {
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
      }, 600000); // 10분 타임아웃

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
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h4>🎙 마이크 녹음 STT</h4>
      <button onClick={isRecording ? handleStop : handleStart} style={{ padding: '12px 28px', fontSize: '1.3rem' }}>
        {isRecording ? '녹음 중지' : '녹음 시작'}
      </button>
      <br /><br />
      {audioFile && (
        <div>
          <p>녹음 파일: {audioFile.name}</p>
          <audio controls src={URL.createObjectURL(audioFile)} style={{ width: '100%' }} />
        </div>
      )}
      <label>언어 선택:&nbsp;
        <select value={lang} onChange={e => setLang(e.target.value)}>
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </label>
      <br /><br />
      <button onClick={handleTranscribe} disabled={!audioFile || selectedSpeakerIds.length === 0}>
        화자분리+STT 변환</button>
      {error && <p style={{ color: 'red' }}><b>{error}</b></p>}
      {result && <pre style={{ marginTop: 16, background: '#f5f5f5', padding: 12 }}>{result}</pre>}
    </div>
  );
}
