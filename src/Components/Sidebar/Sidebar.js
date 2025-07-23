// sidebar.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Network, Search, CircleUserRound, FileVideo2Icon, VideoOff } from 'lucide-react';
import VaultManager from '../../Components/VaultManager/VaultManager';
import { useMousePosition } from './util/useMousePosition'; // Hook import
import GroupList from './util/GroupList';
import { useNotes } from '../../Contexts/NotesContext';
import { useGroups } from '../../Contexts/GroupContext';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import NoteSearchModal from './util/NoteSearchModal';
import './Sidebar.css';
import { useTabs } from '../../Contexts/TabsContext';

export default function SidebarLayout() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
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
    logout
  } = useGroups();
  
  const { notes, loadNotes, loadNotes_lagacy } = useNotes();
  const {openTab} = useTabs();

  useEffect(() => {
    let intervalId;
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        const authres = await tokenInfo();
        
        // 컴포넌트가 언마운트된 경우 중단
        if (!isMounted) return;
        
        if (authres === -1) {
          window.location.href = 'https://login.memoriatest.kro.kr';
          return;
        }
        
        fetchUser();
        fetchProfileImage();
        
        // 컴포넌트가 마운트된 상태에서만 interval 설정
        if (isMounted) {
          intervalId = setInterval(() => {
            setRemainTime(prevRemainTime => {
              if (prevRemainTime < 650) {
                tokenRefresh();
                tokenInfo();
                return 900;
              }
              return prevRemainTime - 1;
            });
          }, 1000);
        }
        
      } catch (error) {
        console.error('Auth initialization failed:', error);
      }
    };
    
    initializeAuth();
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
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

  const handleLogout = () => {
    // 로그아웃
    logout();
  };

  //---------------------------임시 검색---------------------------------
  // 검색 모달 관련 핸들러
  const handleSearchClick = () => {
    setIsSearchModalOpen(true);
  };

  const handleNoteSelect = (note) => {
    console.log('Selected note:', note);
    // 노트 열기 로직 구현
    // vaultRef.current?.openNote(note);
    openTab({ title: note.title, type: 'note', noteId: note.title });
  };

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
              handleAddGraph();
              loadNotes_lagacy(group.group_id); //이거 바꿔야함!!!
            }} />
            <button className="add-note-btn" onClick={handleSearchClick}>
              <Search size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              노트 검색
            </button>
            <button className="add-note-btn" onClick={handleAddNote}>
              <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              새 노트
            </button>
            <button className="add-note-btn" onClick={handleAddGraph}>
              <Network size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              그래프 뷰
            </button>
            <button className="add-note-btn" onClick={() => window.location.href = '/video-conference'}>
              <FileVideo2Icon size={16} style={{ marginRight: 6, verticalAlign: 'middle' }}/>
              화상회의
            </button>
            <button className="add-note-btn" onClick={() => window.location.href = '/offline-meeting'}>
              <VideoOff size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              오프라인 회의
            </button>
          </div>

          {user && (
            <div className="sidebar-footer">
              <div onClick={()=>{console.log(`ClickUserProfile!!`)}} className="user-profile">
                <img src={profileImage} alt="User Avatar" className="user-avatar" />
                <span className="user-name">{user.data.nickname} </span>
                <p>{remainTime}</p>
                <button className='user-logout-btn' onClick={(e)=>{e.stopPropagation();console.log(`로그아웃 버튼`);handleLogout();}}>logout</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="main-content">
        <VaultManager ref={vaultRef} />
      </div>
      <NoteSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        notes={notes} // 실제 노트 데이터로 교체
        onNoteSelect={handleNoteSelect}
      />
      <Toaster />
    </div>
);
}