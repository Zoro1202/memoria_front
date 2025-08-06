// sidebar.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Network, Search, FileVideo2Icon, VideoOff, Group, File, Apple } from 'lucide-react';
import VaultManager from '../../Components/VaultManager/VaultManager';
// import { useMousePosition } from './util/useMousePosition'; // 마우스 위치 검사 훅
import GroupList from './util/GroupList';
import { useNotes } from '../../Contexts/NotesContext';
import { useGroups } from '../../Contexts/GroupContext';
// import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import NoteSearchModal from './util/NoteSearchModal';
import UserWindowModal from '../UserProfile/UserProfile';
import './Sidebar.css';
import { useTabs } from '../../Contexts/TabsContext';
import NoteList from './util/NoteList';
import introJs from 'intro.js';
import 'intro.js/introjs.css';
import MeetingPage from '../OfflineMeeting/Meeting';

export default function SidebarLayout() {
  // const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const sidebarWidth = 240;

  //사이드바 탭
  const [activeTab, setActiveTab] = useState('groups');

  const tabs = [
    { id: 'groups', label: '그룹', icon: Group },
    // { id: 'search', label: '검색', icon: Search },
    { id: 'notes', label: '노트', icon: File }
  ];

  //모달 온오프
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isOfflineMeetingOpen, setIsOfflineMeetingOpen] = useState(false);


  const vaultRef = useRef(null);
  // const mousePosition = useMousePosition(); // 마우스 위치 추적
  
  const {
    remainTime,
    setRemainTime,
    tokenInfo,
    tokenRefresh,
    user,
    profileImage,
    fetchUser,
    fetchProfileImage,
    logout,
    selectedGroupId,
    changeProfileImage, 
    changeNickname,
  } = useGroups();
  
  const { notes, loadNotes_lagacy } = useNotes();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // ✅ 브라우저에 tutorialShown이 없으면 실행
    const hasSeenTutorial = localStorage.getItem('tutorialShown')
    if (!hasSeenTutorial) {
      runIntro()
      localStorage.setItem('tutorialShown', 'true')
    }
  }, [])

  // ✅ ? 버튼 클릭 시 실행
  const handleHelpClick = () => {
    runIntro()
  }

  // 마우스가 왼쪽 영역에 있는지 확인
  // const isMouseOnLeftSide = mousePosition.x < 100;
  // const isMouseOnTabs = mousePosition.y < 65;

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

  //-----------------------------사용자 정보창 모달----------------------------
  const handleUserProfileClick = () => {
    setIsUserModalOpen(true);
  };
  const handleUserSave = async (userData) => {
    console.log('Saving user data:', userData);
    // 저장 로직 구현
    //profileImage
    //formData.nickname
    if(userData?.profileImage)
      await changeProfileImage(userData.profileImage);
    if(userData?.nickname)
      await changeNickname(userData.nickname);
    // API 호출 등...
    setIsUserModalOpen(false);
  };

  const runIntro = () => {
    const intro = introJs()
    intro.setOptions({
      steps: [
        {
          element: '.toggle-btn',
          intro: '사이드바를 열거나 닫을 수 있습니다.',
          position: 'right'
        },
        {
          element: '.asdf-btn:nth-child(2)',
          intro: '노트를 검색할 수 있는 버튼입니다.',
          position: 'right'
        },
        {
          element: '.asdf-btn:nth-child(3)',
          intro: '새로운 노트를 생성합니다.',
          position: 'right'
        },
        {
          element: '.asdf-btn:nth-child(4)',
          intro: '노트 간 관계를 시각화하는 그래프 뷰를 엽니다.',
          position: 'right'
        },
        {
          element: '.main-sidebar-header .sd-tab-button:nth-child(1)',
          intro: '그룹 탭입니다. 그룹별로 노트를 관리할 수 있습니다.',
          position: 'right'
        },
        {
          element: '.main-sidebar-header .sd-tab-button:nth-child(2)',
          intro: '노트 탭입니다. 그룹을 선택 후 선택한 그룹의 전체 노트를 열람할 수 있습니다.',
          position: 'right'
        },
        {
          element: '.user-profile',
          intro: '여기서 계정 정보를 확인할 수 있습니다.',
          position: 'right'
        },
        {
          element: '.tutorial-btn',
          intro: '언제든지 이 버튼을 클릭하여 튜토리얼을 다시 볼 수 있습니다.',
          position: 'left'
        },
      ],
      showProgress: true,
      showBullets: false,
      nextLabel: 'Enter',
      prevLabel: 'Prev',
      doneLabel: 'Done'
    })
  intro.start()
}

  return (
    <div className="container">
      <div className="fixed-sidebar">
        <button
          className="toggle-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? "사이드바 닫기" : "사이드바 열기"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        <button className="asdf-btn" onClick={handleSearchClick} title="노트 검색">
          <Search size={16} />
        </button>
        <button className="asdf-btn" onClick={handleAddNote} title="새 노트">
          <Plus size={16} />
        </button>
        <button className="asdf-btn" onClick={handleAddGraph} title="그래프 뷰">
          <Network size={16} />
        </button>
        <button
          className="asdf-btn"
          onClick={() => (window.location.href = '/video-conference')}
          title="화상회의"
        >
          <FileVideo2Icon size={16} />
        </button>
        <button
          className="asdf-btn"
          onClick={() => setIsOfflineMeetingOpen(true)}
          title="오프라인 회의"
        >
          <VideoOff size={16} />
        </button>
        <button className='tutorial-btn' onClick={handleHelpClick}>
          <Apple size={16}/>
        </button>
      </div>
      {/* 사이드바 */}
      {isOpen && (
        <div
          className="main-sidebar"
          style={{ width: sidebarWidth }}
        >
          <div className="main-sidebar-header">
            {/* <button className="toggle-btn" onClick={() => setIsOpen(false)}>
              <ChevronLeft size={20} />
            </button> */}
            {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                className={`sd-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            );
          })}
          </div>

          <div className="main-sidebar-content">
            {activeTab === 'groups' && (
              <GroupList onGroupSelect={(group) => {
                console.log(group);
                handleAddGraph();
                loadNotes_lagacy(group.group_id); //이거 바꿔야함!!!
              }} />
            )}
            {/* {activeTab === 'search' && (
              <NoteSearchModal
                // 탭 내에서 렌더링되므로 isOpen은 항상 true
                isOpen={true}
                // 탭 내에서는 모달을 닫을 필요가 없으므로 onClose는 빈 함수
                onClose={() => {}}
                notes={notes} // 실제 노트 데이터로 교체
                onNoteSelect={handleNoteSelect}
                // NoteSearchModal 내부에서 닫기 버튼이 보이지 않도록 prop 추가 (선택 사항)
                hideCloseButton={true}
              />
            )} */}
            {activeTab === 'notes' && (
              <NoteList
              onNoteSelect={(note)=>{
                      openTab({ title: note.title, type: 'note', noteId: note.title });
                    }}
              />
            )}
          </div>

          {user && (
        <div className="main-sidebar-footer">
          <div 
            onClick={handleUserProfileClick} // 수정된 부분
            className="user-profile"
          >
            <img src={profileImage} alt="User Avatar" className="user-avatar" />
            <span className="user-name">{user.nickname}</span>
            <p>{remainTime}</p>
            {/* <button 
              className='user-logout-btn' 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
            >
              logout
            </button> */}
          </div>
        </div>
      )}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="main-sidebar-content">
        <VaultManager ref={vaultRef} />
      </div>
      {/* 사용자 설정 모달 */}
      <UserWindowModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={user}
        profileImage={profileImage}
        onSave={handleUserSave}
        onLogout={handleLogout}
      />
      {/* 검색 모달 */}
      <NoteSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        notes={notes} // 실제 노트 데이터로 교체
        onNoteSelect={handleNoteSelect}
      />
      
      {/* 오프라인 회의 모달 */}
      <MeetingPage
       open={isOfflineMeetingOpen}
        onClose={() => setIsOfflineMeetingOpen(false)}
      />
      <Toaster />
    </div>
);
}