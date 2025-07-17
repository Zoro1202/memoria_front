import React, { useState } from 'react';
import axios from 'axios';

export default function FileUploadSTT({ selectedSpeakerIds }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const [lang, setLang] = useState('ko');

  const handleUpload = async () => {
    if (!file || selectedSpeakerIds.length === 0) {
      setError('파일과 화자를 모두 설정해야 합니다.');
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);

    // 다중 샘플 파일 전송 (각 화자별로)
    selectedSpeakerIds.forEach((id, index) => {
      formData.append('sample_files', new File([], `dummy_${id}.wav`)); // 실제 샘플 데이터로 교체 필요
    });

    // 화자 이름 매핑 예시
    const speakerNames = {};
    selectedSpeakerIds.forEach((id, i) => {
      speakerNames[i + 1] = `화자${i + 1}`;
    });
    formData.append('speaker_names', JSON.stringify(speakerNames));

    try {
      const res = await axios.post('/transcribe', formData, {
        timeout: 600000
      });
      setResult(res.data.transcript);
    } catch (err) {
      console.error(err);
      setError('STT 변환 실패');
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
