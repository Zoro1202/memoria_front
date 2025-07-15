import React, { useState, useEffect } from "react";
import "./HomeScreen.css";
import memoriaLogo from './memoria.png';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import Button from '@mui/material/Button';
import RecordingList from "./RecordingList";

export default function JoinRoomUI({
  nickname,
  setNickname,
  isPresenter,
  setIsPresenter,
  roomId,
  setRoomId,
  handleCreateRoom,
  handleJoinRoom
}) {
  const [egg, setEgg] = useState(false);
  const [theme, setTheme] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"
  );
  const [activeTab, setActiveTab] = useState("home"); // ← 탭 상태

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = e => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleLogoClick = () => {
    setEgg(true);
    setTimeout(() => setEgg(false), 1700);
  };

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  const handleJoinRoomClick = () => {
    if (!roomId.trim() || !nickname.trim()) {
      alert("방 ID와 닉네임을 입력해주세요.");
      return;
    }
    handleJoinRoom();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleJoinRoomClick();
  };

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

  return (
    <div className={`home-root ${theme}`}>
      <header className="home-header">
        <span className="logo-area-evo">
          <div className="logo-img-wrap-evo" onClick={handleLogoClick} title="로고 클릭!">
            <img
              src={memoriaLogo}
              alt="Memoria Logo"
              className={`memoria-logo-evo${egg ? " egg-spin" : ""}`}
            />
            <div className="logo-glow-evo" />
            <div className="logo-badge">AI</div>
            {egg && (
              <div className="easter-egg-pop">
                환영합니다 Memoria!<br />최고의 AI 회의 도우미!
              </div>
            )}
          </div>
          <span className="memoria-title-evo">
            Memoria
            <span className="memoria-sub-evo">AI 회의 도우미</span>
          </span>
        </span>
        <nav className="home-tabs">
          {["home","recording", "settings", "main"].map(tab => (
            <span
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                if(tab === "main") {
                  window.location.href = "/main";
                } else {
                  setActiveTab(tab)
                }
              }}
            >
              {{
                home: "홈",
                recording: "녹화",
                settings: "설정",
                main: "돌아가기"
              }[tab]}
            </span>
          ))}
        </nav>
        <div className="header-right">
          <input className="home-search" placeholder="검색" />
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="테마 전환"
            title="테마 전환"
          >
            {theme === "dark" ? <Brightness7Icon fontSize="medium" /> : <Brightness4Icon fontSize="medium" />}
          </button>
        </div>
      </header>

      <main className="home-main">
        {(activeTab === "home" || activeTab === "meeting") && (
          <>
            {/* 시계/날짜 카드 */}
            <section className="home-info-card">
              <div className="home-clock">{time}</div>
              <div className="home-date">{date}</div>
              <div className="home-today-meeting">오늘 예정된 회의 없음</div>
            </section>
            {/* 방 생성/입장 UI */}
            <section className="join-room-ui-container">
              <div className="join-room-cards">
                <div className="card">
                  <h3>방 생성</h3>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<AddCircleIcon />}
                    onClick={handleCreateRoom}
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      borderRadius: 2,
                      minWidth: 140,
                      boxShadow: 2,
                      mb: 1,
                    }}
                    fullWidth
                  >
                    방 생성
                  </Button>
                </div>
                <div className="card">
                  <h3>방 참가</h3>
                  <input
                    type="text"
                    placeholder="방 ID"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <input
                    type="text"
                    placeholder="닉네임"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isPresenter}
                      onChange={e => setIsPresenter(e.target.checked)}
                    />
                    발표자 여부
                  </label>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<MeetingRoomIcon />}
                    onClick={handleJoinRoomClick}
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      borderRadius: 2,
                      minWidth: 140,
                      boxShadow: 2,
                      mt: 1,
                    }}
                    fullWidth
                  >
                    방 참가
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "recording" && (
          <section className="recording-section">
            <div className="recording-card">
              <div className="recording-header">
                <span className="recording-icon" role="img" aria-label="녹화">
                  🎥
                </span>
                <span className="recording-title">방별 녹화 목록</span>
              </div>
              <div className="recording-form">
                <input
                  type="text"
                  placeholder="방 ID를 입력하세요"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  className="recording-roomid-input"
                />
              </div>
              <div className="recording-list-wrap">
                <RecordingList roomId={roomId} />
              </div>
              <div className="recording-tip">
                <span role="img" aria-label="tip">💡</span>
                방 ID를 입력하면 해당 회의방의 녹화 목록을 볼 수 있습니다.
              </div>
            </div>
          </section>
        )}
        {activeTab === "settings" && (
          <section className="dummy-section">
            <h2>⚙️ 설정 탭</h2>
            <p>사용자 이름, 발표자 여부, 언어 설정 등 UI를 제공할 수 있습니다.</p>
          </section>
        )}
      </main>
    </div>
  );
}
