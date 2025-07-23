import React, { useState } from 'react';

export default function FileUploadSTT({ selectedSpeakerIds }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState('ko');

  // fetch with timeout helper 함수
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

  const handleUpload = async () => {
    if (!file || selectedSpeakerIds.length === 0) {
      setError('파일과 화자를 모두 설정해야 합니다.');
      return;
    }
    setError('');
    setResult('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);

    selectedSpeakerIds.forEach((id, index) => {
      formData.append('sample_files', new File([], `dummy_${id}.wav`));
    });

    const speakerNames = {};
    selectedSpeakerIds.forEach((id, i) => {
      speakerNames[i + 1] = `화자${i + 1}`;
    });
    formData.append('speaker_names', JSON.stringify(speakerNames));

    try {
      const res = await fetchWithTimeout('/transcribe', {
        method: 'POST',
        body: formData,
      }, 600000); // 10분 타임아웃

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setResult(data.transcript);
    } catch (err) {
      console.error(err);
      setError(err.message || 'STT 변환 실패');
    }
  };

  return (
    <div>
      <h4>📁 음성 파일 업로드</h4>
      <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0])} />
      <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ marginLeft: 10 }}>
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
      <button onClick={handleUpload} style={{ marginLeft: 10 }}>변환 시작</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <pre style={{ background: '#f4f4f4', padding: 10 }}>{result}</pre>
      )}
    </div>
  );
}
