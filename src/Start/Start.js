import './Start.css';
import { useNavigate } from 'react-router-dom';
import { getValidAccessToken } from './Utils/auth'; // Import the function to check access token validity
export default function Start() {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    const token = getValidAccessToken();
    if (token) {
      // 이미 로그인돼 있으면 곧바로 서비스 페이지로
      navigate('/main');        // or '/'
    } else {
      // 없거나 만료 → 로그인 서버로 리다이렉트
      window.location.href = 'https://login.memoriatest.kro.kr';
    }
  };
  const handleEnter = () => {
    navigate('/vault'); // Uncomment this line to redirect to the graph page
  };
  
//DOM
  return (
    <div className="start-wrapper">
      <div className="start-container">
        <div className="start-left">
          <h1 className="start-title">
            생각을 연결하고 실행으로 옮기는 <span className="highlight">AI 워크스페이스</span>
          </h1>
          <p className="start-subtitle">
            아이디어에서 실행까지, 모든 흐름을 하나의 공간에서<br />
            프로젝트를 완료할 수 있는 하나의 공간.
          </p>
          <div className="start-buttons">
            <button className="btn primary" onClick={handleLogin}>
              Memoria 무료로 사용하기
            </button>
            <button className="btn secondary" onClick={handleEnter}>
              데모 요청하기
            </button>
          </div>
        </div>

        <div className="start-right">
          <img src="/memoria.png" alt="Mascot" className="start-image" />
        </div>
      </div>
    </div>
  );
}
