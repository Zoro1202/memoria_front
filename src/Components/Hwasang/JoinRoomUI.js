import React, { useState } from "react";
import "./HomeScreen.css";
import memoriaLogo from './memoria.png';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import HomeIcon from '@mui/icons-material/Home';
import VideocamIcon from '@mui/icons-material/Videocam';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import RecordingList from "./RecordingList";

export default function HomeScreen({
  nickname,
  setNickname,
  isPresenter,
  setIsPresenter,
  roomId,
  setRoomId,
  handleJoinRoom
}) {
  const [theme, setTheme] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"
  );
  const [activeTab, setActiveTab] = useState("home");

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  const handleJoinRoomClick = () => {
    if (!roomId.trim() || !nickname.trim()) {
      alert("그룹 ID와 닉네임을 입력해주세요.");
      return;
    }
    handleJoinRoom();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleJoinRoomClick();
  };
  
  const menuItems = [
    { id: 'home', label: '화상회의', icon: <HomeIcon /> },
    { id: 'recording', label: '녹화 목록', icon: <VideocamIcon /> },
    { id: 'settings', label: '설정', icon: <SettingsIcon /> },
    { id: 'main', label: '메인으로 돌아가기', icon: <ArrowBackIcon />, action: () => window.location.href = "/main" }
  ];

  return (
    <div className={`app-layout ${theme}`}>
      <nav className="sidebar">
        <div className="sidebar-header">
          <img src={memoriaLogo} alt="Memoria Logo" className="sidebar-logo" />
        </div>
        <ul className="sidebar-menu">
          {menuItems.map(item => (
            <li
              key={item.id}
              className={`menu-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => item.action ? item.action() : setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title="테마 전환"
          >
            {theme === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === "home" && (
          <section className="content-section">
            <h2>회의 시작 또는 참가</h2>
            <p>그룹 ID와 닉네임을 입력하여 회의에 참여하세요.</p>
            <div className="join-form-container">
              <input
                type="text"
                placeholder="그룹 ID"
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
                발표자로 시작
              </label>
              <Button
                variant="contained"
                startIcon={<MeetingRoomIcon />}
                onClick={handleJoinRoomClick}
                fullWidth
              >
                회의 시작
              </Button>
            </div>
          </section>
        )}

        {activeTab === "recording" && (
          <section className="content-section">
            <h2>방별 녹화 목록</h2>
            <p>그룹 ID를 입력하면 해당 회의의 녹화 목록을 볼 수 있습니다.</p>
            <div className="recording-container">
              <input
                type="text"
                placeholder="그룹 ID를 입력하세요"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className="recording-roomid-input"
              />
              <div className="recording-list-wrap">
                <RecordingList roomId={roomId} />
              </div>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="content-section">
            <h2>⚙️ 설정</h2>
            <p>이곳에서 애플리케이션 관련 설정을 변경할 수 있습니다.</p>
          </section>
        )}
      </main>
    </div>
  );
}
