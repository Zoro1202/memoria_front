import './Start.css';
import { useNavigate } from 'react-router-dom';

export default function Start() {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    navigate('/login'); // Uncomment this line to redirect to the login page
  };
  const handleEnter = () => {
    navigate('/vault'); // Uncomment this line to redirect to the graph page
  };
  

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
