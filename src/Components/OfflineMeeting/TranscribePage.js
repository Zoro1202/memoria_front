// React의 핵심 훅들을 가져오기
import React, { useState, useRef } from 'react';
// HTTP 요청을 위한 axios 라이브러리
import axios from 'axios';

// 파일 업로드와 STT 변환을 처리하는 컴포넌트
function TranscribePage() {
  // 업로드할 메인 오디오 파일을 저장하는 상태
  const [file, setFile] = useState(null);
  // 샘플 오디오 파일들을 저장하는 상태 (배열)
  const [sampleFiles, setSampleFiles] = useState([]);
  // 선택된 언어를 저장하는 상태 (기본값: 한국어)
  const [lang, setLang] = useState('ko');
  // 화자명 매핑 정보를 JSON 문자열로 저장하는 상태
  const [speakerNames, setSpeakerNames] = useState('{}');
  // STT 변환 결과를 저장하는 상태
  const [result, setResult] = useState('');
  // 로딩 상태를 나타내는 상태 (변환 중일 때 true)
  const [loading, setLoading] = useState(false);
  // 에러 메시지를 저장하는 상태
  const [error, setError] = useState('');
  // 메인 파일 입력 필드를 참조하기 위한 useRef
  const fileInputRef = useRef();
  // 샘플 파일 입력 필드를 참조하기 위한 useRef
  const sampleInputRef = useRef();

  // public 폴더에서 미리 준비된 샘플 파일들을 불러오는 비동기 함수
  const handleSampleLoad = async () => {
    // 이전 에러와 결과 메시지 초기화
    setError('');
    setResult('');
    try {
      // public 폴더에 있는 샘플 파일들의 URL 배열
      const sampleUrls = ['/sample1.wav', '/sample2.wav'];
      // 불러온 샘플 파일들을 저장할 배열
      const loadedSamples = [];
      // 각 샘플 URL에 대해 순회
      for (const url of sampleUrls) {
        // fetch API로 파일 다운로드
        const response = await fetch(url);
        // 응답을 Blob 객체로 변환
        const blob = await response.blob();
        // Blob을 File 객체로 변환하여 배열에 추가
        loadedSamples.push(new File([blob], url.replace('/',''), { type: blob.type }));
      }
      // 불러온 샘플 파일들을 상태에 저장
      setSampleFiles(loadedSamples);
    } catch (e) {
      // 파일 불러오기 실패 시 에러 메시지 설정
      setError('샘플 파일을 불러오지 못했습니다.');
    }
  };

  // 화자명 JSON 형식이 올바른지 검증하는 함수
  const validateSpeakerNames = (input) => {
    try {
      // JSON 문자열을 파싱 시도
      const parsed = JSON.parse(input);
      // 파싱된 결과가 객체이고 배열이 아닌지 확인
      if (typeof parsed !== 'object' || Array.isArray(parsed)) return false;
      return true;
    } catch {
      // JSON 파싱 실패 시 false 반환
      return false;
    }
  };

  // 폼 제출을 처리하는 비동기 함수
  const handleSubmit = async (e) => {
    // 폼의 기본 제출 동작 방지 (페이지 새로고침 방지)
    e.preventDefault();
    // 이전 결과와 에러 메시지 초기화
    setResult('');
    setError('');
    // 메인 파일이 선택되지 않았으면 에러 메시지 표시
    if (!file) {
      setError('파일을 선택하세요.');
      return;
    }
    // 화자명 JSON 형식이 올바르지 않으면 에러 메시지 표시
    if (!validateSpeakerNames(speakerNames)) {
      setError('화자명(JSON) 형식이 올바르지 않습니다.');
      return;
    }
    // 로딩 상태를 true로 설정 (변환 시작)
    setLoading(true);
    // FormData 객체 생성 (파일 업로드용)
    const formData = new FormData();
    // 메인 오디오 파일을 'file' 필드에 추가
    formData.append('file', file);
    // 각 샘플 파일을 'sample_files' 필드에 추가 (여러 개 가능)
    sampleFiles.forEach(f => formData.append('sample_files', f));
    // 선택된 언어를 'lang' 필드에 추가
    formData.append('lang', lang);
    // 화자명 정보를 'speaker_names' 필드에 추가
    formData.append('speaker_names', speakerNames);
    try {
      // 백엔드 서버로 STT 변환 요청 전송 (타임아웃 10분)
      const res = await axios.post(
        'http://localhost:7001/transcribe',
        formData,
        { timeout: 600000 } // 10분 타임아웃 (큰 파일 처리 시간 고려)
      );
      // 응답에서 변환된 텍스트를 결과 상태에 저장
      setResult(res.data.transcript);
    } catch (e) {
      // 요청 실패 시 에러 메시지 설정
      setError(
        e.response?.data?.error || // 서버에서 반환한 에러 메시지
        e.message || // 네트워크 에러 메시지
        JSON.stringify(e) // 기타 에러 정보
      );
      // 콘솔에 상세 에러 정보 출력 (디버깅용)
      console.error('STT 변환 에러:', e);
    } finally {
      // 성공/실패 관계없이 로딩 상태를 false로 설정
      setLoading(false);
    }
  };

  // 컴포넌트의 JSX 렌더링 부분
  return (
    <div>
      {/* 페이지 제목 */}
      <h3>📁 음성 파일 업로드</h3>
      {/* 폼 요소 (제출 시 handleSubmit 함수 실행) */}
      <form onSubmit={handleSubmit}>
        <div>
          {/* 메인 오디오 파일 선택 입력 필드 */}
          <input
            type="file"
            accept="audio/*" // 오디오 파일만 선택 가능
            onChange={e => setFile(e.target.files[0])} // 첫 번째 선택된 파일을 상태에 저장
            ref={fileInputRef} // ref로 DOM 요소 참조
          />
          {/* 미리 준비된 샘플 파일 불러오기 버튼 */}
          <button type="button" onClick={handleSampleLoad} style={{ marginLeft: 8 }}>
            샘플 파일 불러오기
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          {/* 숨겨진 샘플 파일 선택 입력 필드 (여러 파일 선택 가능) */}
          <input
            type="file"
            accept="audio/*" // 오디오 파일만 선택 가능
            multiple // 여러 파일 동시 선택 가능
            ref={sampleInputRef} // ref로 DOM 요소 참조
            style={{ display: 'none' }} // 화면에 보이지 않도록 숨김
            onChange={e => setSampleFiles(Array.from(e.target.files))} // 선택된 파일들을 배열로 변환하여 상태에 저장
          />
          {/* 숨겨진 파일 입력 필드를 클릭하는 버튼 */}
          <button
            type="button"
            onClick={() => sampleInputRef.current && sampleInputRef.current.click()}
          >
            샘플 파일 직접 선택
          </button>
          {/* 선택된 샘플 파일들이 있을 때만 파일 목록 표시 */}
          {sampleFiles.length > 0 && (
            <div style={{ marginTop: 5, fontSize: 14 }}>
              <b>샘플 파일({sampleFiles.length}개): </b>
              {/* 각 샘플 파일의 이름을 쉼표로 구분하여 표시 */}
              {sampleFiles.map(f => f.name).join(', ')}
            </div>
          )}
        </div>
        {/* 메인 파일이 선택되었을 때만 오디오 플레이어 표시 */}
        {file && (
          <div style={{ marginTop: 10 }}>
            <audio controls src={URL.createObjectURL(file)} />
          </div>
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
        {/* 화자명 매핑 정보 입력 필드 */}
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
        {/* 폼 제출 버튼 (로딩 중일 때 비활성화) */}
        <button type="submit" disabled={loading}>
          {loading ? '변환 중...' : '화자분리+STT 변환'}
        </button>
      </form>
      {/* 에러 메시지가 있을 때만 빨간색으로 표시 */}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {/* 결과가 없고 로딩 중이 아니고 에러도 없을 때 안내 메시지 표시 */}
      {result === '' && !loading && !error && <div>결과가 없습니다.</div>}
      {/* STT 결과가 있을 때만 표시 */}
      {result && (
        <div style={{ marginTop: 20 }}>
          <h4>결과</h4>
          {/* pre 태그로 줄바꿈과 공백을 그대로 유지하여 표시 */}
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// 컴포넌트를 다른 파일에서 사용할 수 있도록 내보내기
export default TranscribePage;
