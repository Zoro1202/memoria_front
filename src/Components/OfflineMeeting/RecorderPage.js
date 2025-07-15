// React의 핵심 훅들을 가져오기 (useState: 상태 관리, useRef: DOM 참조)
import React, { useState, useRef } from 'react';
// HTTP 요청을 위한 axios 라이브러리
import axios from 'axios';

// 마이크 녹음과 STT 변환을 처리하는 메인 컴포넌트
function RecorderPage() {
  // 녹음된 오디오 파일을 저장하는 상태 (초기값: null)
  const [file, setFile] = useState(null);
  // 현재 녹음 중인지 여부를 나타내는 상태 (초기값: false)
  const [isRecording, setIsRecording] = useState(false);
  // STT 변환 결과를 저장하는 상태 (초기값: 빈 문자열)
  const [result, setResult] = useState('');
  // 에러 메시지를 저장하는 상태 (초기값: 빈 문자열)
  const [error, setError] = useState('');
  // 선택된 언어를 저장하는 상태 (초기값: 'ko' - 한국어)
  const [lang, setLang] = useState('ko');
  // 화자명 매핑 정보를 JSON 문자열로 저장하는 상태 (초기값: 빈 객체)
  const [speakerNames, setSpeakerNames] = useState('{}');
  // MediaRecorder 객체를 참조하기 위한 useRef 훅
  const mediaRecorderRef = useRef(null);

  // 녹음을 시작하는 비동기 함수
  const handleStartRecording = async () => {
    // 이전 에러와 결과 메시지 초기화
    setError('');
    setResult('');
    try {
      // 브라우저가 미디어 장치와 MediaRecorder를 지원하는지 확인
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        setError('이 브라우저는 녹음 기능을 지원하지 않습니다.');
        return;
      }
      // 사용자의 마이크에 접근 권한 요청 (오디오만)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // MediaRecorder 객체 생성 (마이크 스트림을 녹음용으로 설정)
      const mediaRecorder = new MediaRecorder(stream);
      // 녹음된 데이터 청크들을 저장할 배열
      const chunks = [];
      // 녹음 데이터가 사용 가능할 때마다 chunks 배열에 추가
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      // 녹음이 중지되었을 때 실행되는 이벤트 핸들러
      mediaRecorder.onstop = () => {
        // 모든 청크를 합쳐서 하나의 Blob 객체 생성 (webm 형식)
        const blob = new Blob(chunks, { type: 'audio/webm' });
        // Blob을 File 객체로 변환 (현재 시간을 포함한 고유한 파일명)
        const audioFile = new File([blob], `recorded_${Date.now()}.webm`, { type: 'audio/webm' });
        // 생성된 파일을 상태에 저장
        setFile(audioFile);
      };
      // 녹음 시작
      mediaRecorder.start();
      // MediaRecorder 객체를 ref에 저장 (나중에 중지할 때 사용)
      mediaRecorderRef.current = mediaRecorder;
      // 녹음 상태를 true로 변경
      setIsRecording(true);
    } catch (err) {
      // 마이크 접근 실패 시 에러 메시지 설정
      setError('마이크 접근 실패: ' + err.message);
    }
  };

  // 녹음을 중지하는 함수
  const handleStopRecording = () => {
    // MediaRecorder 객체가 존재하는지 확인
    if (mediaRecorderRef.current) {
      // 녹음 중지 (이때 onstop 이벤트가 발생하여 파일이 생성됨)
      mediaRecorderRef.current.stop();
      // 녹음 상태를 false로 변경
      setIsRecording(false);
    }
  };

  // STT 변환을 요청하는 비동기 함수
  const handleTranscribe = async () => {
    // 이전 에러와 결과 메시지 초기화
    setError('');
    setResult('');
    // 녹음된 파일이 없으면 에러 메시지 표시
    if (!file) {
      setError('녹음된 파일이 없습니다.');
      return;
    }
    try {
      // FormData 객체 생성 (multipart/form-data 형식으로 파일 전송용)
      const formData = new FormData();
      // 녹음된 파일을 'file' 필드에 추가
      formData.append('file', file);
      // 선택된 언어를 'lang' 필드에 추가
      formData.append('lang', lang);
      // 화자명 정보를 'speaker_names' 필드에 추가
      formData.append('speaker_names', speakerNames);
      // 백엔드 서버의 /transcribe 엔드포인트로 POST 요청 전송
      const res = await axios.post('http://localhost:7001/transcribe', formData);
      // 응답에서 변환된 텍스트를 결과 상태에 저장
      setResult(res.data.transcript);
    } catch (e) {
      // 요청 실패 시 에러 메시지 설정 (서버 응답 에러 또는 네트워크 에러)
      setError(e.response?.data?.error || e.message);
    }
  };

  // 컴포넌트의 JSX 렌더링 부분
  return (
    <div>
      {/* 페이지 제목 */}
      <h3>🎙 마이크 녹음</h3>
      {/* 녹음 시작/중지 버튼 (녹음 상태에 따라 텍스트와 동작이 변경됨) */}
      <button onClick={isRecording ? handleStopRecording : handleStartRecording}>
        {isRecording ? '녹음 중지' : '녹음 시작'}
      </button>
      <br /><br />
      {/* 파일이 존재할 때만 파일 정보와 오디오 플레이어 표시 */}
      {file && (
        <>
          {/* 녹음된 파일의 이름 표시 */}
          <p>녹음 파일: {file.name}</p>
          {/* 녹음된 오디오를 재생할 수 있는 HTML5 audio 태그 */}
          <audio controls src={URL.createObjectURL(file)} />
        </>
      )}
      <br />
      {/* 언어 선택 드롭다운 */}
      <label>
        언어 선택:&nbsp;
        <select value={lang} onChange={e => setLang(e.target.value)}>
          <option value="ko">한국어 (CLOVA)</option>
          <option value="en">영어 (Google STT)</option>
        </select>
      </label>
      <br /><br />
      {/* 화자명 매핑 정보 입력 필드 (JSON 형식) */}
      <label>
        화자명(JSON):&nbsp;
        <input
          type="text"
          value={speakerNames}
          onChange={e => setSpeakerNames(e.target.value)}
          placeholder='{"1":"홍길동","2":"김영희"}'
        />
      </label>
      <br /><br />
      {/* STT 변환 버튼 (파일이 없으면 비활성화) */}
      <button onClick={handleTranscribe} disabled={!file}>화자분리+STT 변환</button>
      <br /><br />
      {/* 에러 메시지가 있을 때만 빨간색으로 표시 */}
      {error && <div style={{ color: 'red' }}>❌ {error}</div>}
      {/* STT 결과가 있을 때만 표시 */}
      {result && (
        <div>
          <h4>결과</h4>
          {/* pre 태그로 줄바꿈과 공백을 그대로 유지하여 표시 */}
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// 컴포넌트를 다른 파일에서 사용할 수 있도록 내보내기
export default RecorderPage;
