// React 라이브러리에서 기본 React 객체 가져오기
import React from 'react';
// React Router의 라우팅 관련 컴포넌트들 가져오기
import { Routes, Route, Link } from 'react-router-dom';
// 마이크 녹음 페이지 컴포넌트 가져오기
import RecorderPage from './RecorderPage';
// 파일 업로드 페이지 컴포넌트 가져오기
import TranscribePage from './TranscribePage';

// 메인 앱 컴포넌트 (라우팅을 관리)
function App() {
  return (
    // 전체 앱을 감싸는 div (최대 너비 600px, 중앙 정렬, 패딩 32px)
    <div style={{ maxWidth: 600, margin: 'auto', padding: 32 }}>
      {/* 앱의 메인 제목 */}
      <h2>🎧 음성 변환 및 STT</h2>
      {/* React Router의 Routes 컴포넌트 (라우트 정의) */}
      <Routes>
        {/* 루트 경로 ("/")에 대한 라우트 */}
        <Route
          path="/"
          element={
            <div>
              {/* 메인 페이지 안내 텍스트 */}
              <p>원하는 작업을 선택하세요:</p>
              {/* 마이크 녹음 페이지로 이동하는 링크 */}
              <Link to="/record">
                <button style={{ marginBottom: 16 }}>🎙 마이크로 녹음</button>
              </Link>
              <br />
              {/* 파일 업로드 페이지로 이동하는 링크 */}
              <Link to="/transcribe">
                <button>📁 음성 파일 업로드</button>
              </Link>
            </div>
          }
        />
        {/* "/record" 경로에 RecorderPage 컴포넌트 연결 */}
        <Route path="/record" element={<RecorderPage />} />
        {/* "/transcribe" 경로에 TranscribePage 컴포넌트 연결 */}
        <Route path="/transcribe" element={<TranscribePage />} />
      </Routes>
    </div>
  );
}

// App 컴포넌트를 다른 파일에서 사용할 수 있도록 내보내기
export default App;
