// sidebar.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Network, Group, CircleUserRound, VideoOff } from 'lucide-react';
import VaultManager from '../../Components/VaultManager/VaultManager';
import { useMousePosition } from './util/useMousePosition'; // Hook import
import GroupList from './util/GroupList';
import { useNotes } from '../../Contexts/NotesContext';
import { useGroups } from '../../Contexts/GroupContext';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './Sidebar.css';

export default function SidebarLayout() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [showToggleButton, setShowToggleButton] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const vaultRef = useRef(null);
  const mousePosition = useMousePosition(); // 마우스 위치 추적
  
  const {
    sid,
    provider,
    remainTime,
    setRemainTime,
    tokenInfo,
    tokenRefresh,
    user,
    profileImage,
    fetchUser,
    fetchProfileImage,
  } = useGroups();
  
  const { loadNotes, loadNotes_lagacy } = useNotes();

  useEffect(() => {
    fetchUser();
    fetchProfileImage();
    tokenInfo();
    setInterval(() => {
      setRemainTime(prevRemainTime => {
        if (prevRemainTime < 650) {
          tokenRefresh();
          tokenInfo();
          return 900;
        }
        return prevRemainTime - 1;
      });
    }, 1000);
  }, []);

  // 마우스가 왼쪽 영역에 있는지 확인
  const isMouseOnLeftSide = mousePosition.x < 100;
  const isMouseOnTabs = mousePosition.y < 65;

  // 버튼 핸들러들
  const handleAddNote = useCallback(() => {
    vaultRef.current?.addTab();
  }, []);

  const handleAddGraph = useCallback(() => {
    vaultRef.current?.addGraphTab();
  }, []);

  return (
    <div className="container">
      {/* 마우스 위치 추적 토글 버튼 */}
      {!isOpen && isMouseOnLeftSide && !isMouseOnTabs && (
        <div
          className="toggle-btn-follow-mouse"
          style={{
            left: `${20}px`,
            top: `${mousePosition.y - 20}px`,
          }}
          onClick={() => setIsOpen(true)}
        >
          <ChevronRight size={20} />
        </div>
      )}

      {/* 사이드바 */}
      {isOpen && (
        <div
          className="sidebar"
          style={{ width: sidebarWidth }}
        >
          <div className="sidebar-header">
            <button className='main-logo' onClick={() => navigate('/')}>
              <img src="/memoria.png" alt="Logo" className="logo" />
            </button>
            <button className="toggle-btn" onClick={() => setIsOpen(false)}>
              <ChevronLeft size={20} />
            </button>
          </div>

          <div className="sidebar-content">
            <GroupList onGroupSelect={(group) => {
              console.log(group);
              loadNotes_lagacy(group.group_id); //이거 바꿔야함!!!
            }} />
            <button className="add-note-btn" onClick={handleAddNote}>
              <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              새 노트
            </button>
            <button className="add-note-btn" onClick={handleAddGraph}>
              <Network size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              그래프 뷰
            </button>
            <button className="add-note-btn" onClick={() => window.location.href = '/video-conference'}>
              <i className="fas fa-video" style={{ marginRight: 6, verticalAlign: 'middle' }}></i>
              화상회의
            </button>
            <button className="add-note-btn" onClick={() => window.location.href = '/offline-meeting'}>
              <VideoOff size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              오프라인 회의
            </button>
          </div>

          {user && (
            <div className="sidebar-footer">
              <div className="user-profile">
                <img src={profileImage} alt="User Avatar" className="user-avatar" />
                <span className="user-name">{user.nickname} </span>
                <p>{remainTime}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="main-content">
        <VaultManager ref={vaultRef} />
      </div>
      <Toaster />
    </div>
  );
}