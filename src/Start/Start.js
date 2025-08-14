// start.js - 김형우
import React, { useState } from 'react';
import './Start.css';
import { useNavigate } from 'react-router-dom';
import { getValidAccessToken } from './Utils/auth'; // Import the function to check access token validity

export default function Start() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'demo'
  const [fadeDirection, setFadeDirection] = useState('in');
  const [isFadingOut, setIsFadingOut] = useState(false); // 페이지 전환 효과를 위한 상태

  // 페이지 이동 핸들러
  const handleNavigate = (destination) => {
    setIsFadingOut(true); // 페이드 아웃 시작
    setTimeout(() => {
      if (destination.startsWith('http')) {
        window.location.href = destination;
      } else {
        navigate(destination);
      }
    }, 500); // 애니메이션 시간(0.5초) 후 이동
  };

  const handleLogin = () => {
    const token = getValidAccessToken();
    if (token) {
      handleNavigate('/main'); // or '/'
    } else {
      handleNavigate('https://login.memoriatest.kro.kr');
    }
  };

  const handleDemo = () => {
    handleNavigate('/vault');
  };

  const handleTabClick = (tabName) => {
    if (activeTab === tabName) return; // 같은 탭 클릭 시 아무것도 안 함
    setFadeDirection('out');
    setTimeout(() => {
      setActiveTab(tabName);
      setFadeDirection('in');
    }, 300); // 애니메이션 지속 시간과 일치
  };

  const renderContent = () => {
    if (activeTab === 'login') {
      return (
        <div className={`tab-content ${fadeDirection}`}>
          <h2 className="content-title">Memoria 무료로 시작하기</h2>
          <p className="content-description">지금 바로 Memoria에 가입하고, AI 기반 워크스페이스의 모든 기능을 경험해보세요. 당신의 아이디어를 현실로 만드는 데 필요한 모든 도구가 여기에 있습니다.</p>
          <button className="btn primary large" onClick={handleLogin}>
            Memoria 무료로 사용하기
          </button>
        </div>
      );
    } /*else if (activeTab === 'demo') {
      return (
        <div className={`tab-content ${fadeDirection}`}>
          <h2 className="content-title">데모 요청하기</h2>
          <p className="content-description">Memoria의 강력한 기능을 직접 보고 싶으신가요? 데모를 요청하시면, 전문가가 Memoria를 활용하는 방법을 상세히 안내해 드립니다.</p>
          <button className="btn primary large" onClick={handleDemo}>
            데모 요청하기
          </button>
        </div>
      );
    }*/
    return null;
  };

  
//DOM
  return (
    <div className={`start-wrapper ${isFadingOut ? 'fading-out' : ''}`}>
      <div className="start-container">
        <div className="start-left">
          <h1 className="start-title immersive-text">
            생각을 연결하고 실행으로 옮기는 <span className="highlight">AI 워크스페이스</span>
          </h1>
          <p className="start-subtitle immersive-text">
            아이디어에서 실행까지, 모든 흐름을 하나의 공간에서<br />
            프로젝트를 완료할 수 있는 하나의 공간.
          </p>
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => handleTabClick('login')}
            >
              무료 사용
            </button>
            {/* <button
              className={`tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
              onClick={() => handleTabClick('demo')}
            >
              데모 요청
            </button> */}
          </div>
          {renderContent()}
        </div>

        <div className="start-right">
          <img src="/memoria.png" alt="Mascot" className="start-image" />
        </div>
      </div>
    </div>
  );
}
