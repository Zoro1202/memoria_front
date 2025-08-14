import React, { useState, useEffect, useCallback } from 'react';
import './MemoriaTutorialModal.css';
import { ChevronLeft, ChevronRight, X, Search, Plus, Network, FileVideo2Icon, VideoOff, Group, File, User, Folder } from 'lucide-react';
import GraphView from '../Graph/Graph'; // GraphView 컴포넌트 임포트

const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Memoria 시작하기',
    description: 'Memoria에 오신 것을 환영합니다! 이 튜토리얼은 Memoria의 주요 기능들을 시각적으로 안내합니다. 모든 데모는 실제 기능이 아닌 시뮬레이션된 화면입니다.',
    content: (
      <div className="tutorial-content-placeholder">
        <h3>Memoria, 당신의 AI 워크스페이스</h3>
        <p>생각을 연결하고 실행으로 옮기는 새로운 방법을 경험해보세요.</p>
        <img src="/memoria.png" alt="Memoria Welcome" style={{ maxWidth: '80%', height: 'auto', borderRadius: '8px' }} />
      </div>
    )
  },
  {
    id: 'sidebar',
    title: '사이드바 탐색',
    description: '사이드바는 Memoria의 핵심 내비게이션 허브입니다. 그룹, 노트, 검색, 그리고 다양한 AI 기능에 빠르게 접근할 수 있습니다.',
    content: (
      <div className="tutorial-content-demo sidebar-demo">
        <div className="sidebar-mock">
          <div className="sidebar-header-mock">
            <div className="sidebar-tab-mock active"><Group size={16} /> 그룹</div>
            <div className="sidebar-tab-mock"><File size={16} /> 노트</div>
          </div>
          <div className="sidebar-content-mock">
            <p style={{fontSize: '11px'}}>그룹 목록 (예시)</p>
            <ul>
              <li style={{fontSize: '12px'}}><Folder size={14} /> 프로젝트 A</li>
              <li style={{fontSize: '12px'}}><Folder size={14} /> 스터디 그룹</li>
              <li style={{fontSize: '12px'}}><Folder size={14} /> 개인 노트</li>
            </ul>
          </div>
          <div className="sidebar-footer-mock" style={{fontSize: '10px'}}> 
            <User size={16} /> 사용자 이름
          </div>
        </div>
        <div className="sidebar-buttons-mock">
          <button><Search size={16} /></button>
          <button><Plus size={16} /></button>
          <button><Network size={16} /></button>
          <button><FileVideo2Icon size={16} /></button>
          <button><VideoOff size={16} /></button>
        </div>
        <p>좌측의 아이콘 버튼을 통해 주요 기능에 빠르게 접근하고, 탭을 전환하여 그룹 및 노트를 관리할 수 있습니다.</p>
      </div>
    )
  },
  {
    id: 'note-editor',
    title: '노트 편집기',
    description: '강력한 노트 편집기로 아이디어를 자유롭게 기록하고 정리하세요. 마크다운 지원과 다양한 서식 옵션을 제공합니다.',
    content: (
      <div className="tutorial-content-demo note-editor-demo">
        <div className="toolbar-mock">
          <span>B</span> <i>I</i> <u>U</u> <span className="code-mock">{}</span>
        </div>
        <textarea className="editor-mock" readOnly value="# Memoria 노트 예시\n\n이곳에 자유롭게 아이디어를 기록하고 정리할 수 있습니다.\n\n- **마크다운 지원:** 굵게, 기울임, 밑줄 등\n- `코드 블록`도 지원합니다.\n\n## 주요 기능\n1. 텍스트 서식 지정\n2. 이미지 및 파일 첨부\n3. AI 어시스턴트 연동"></textarea>
        <p>직관적인 인터페이스로 텍스트를 작성하고, 마크다운 문법을 활용하여 노트를 풍부하게 만들 수 있습니다.</p>
      </div>
    )
  },
  {
    id: 'ai-assistance',
    title: 'AI 어시스턴트',
    description: 'Synapse AI가 당신의 작업을 돕습니다. 요약, 제목 생성, 번역, 그리고 자유로운 대화를 통해 생산성을 극대화하세요.',
    content: (
      <div className="tutorial-content-demo ai-assistance-demo">
        <div className="chat-window-mock">
          <div className="message-mock user">노트 요약해줘.</div>
          <div className="message-mock ai">네, 노트를 요약해 드리겠습니다. 주요 내용은 다음과 같습니다: ...</div>
          <div className="message-mock user">이 문장을 번역해줘: "Hello, world!"</div>
          <div className="message-mock ai">"Hello, world!"는 "안녕하세요, 세상!"으로 번역됩니다.</div>
          <input type="text" placeholder="AI에게 질문하세요..." disabled />
        </div>
        <p>AI 어시스턴트와 대화하며 노트 요약, 번역, 아이디어 구상 등 다양한 작업을 수행할 수 있습니다.</p>
      </div>
    )
  },
  {
    id: 'graph-view',
    title: '그래프 뷰',
    description: '노트 간의 연결 관계를 시각적으로 탐색하세요. 아이디어의 흐름을 한눈에 파악하고 새로운 통찰력을 얻을 수 있습니다.',
    content: (
      <div className="tutorial-content-demo graph-view-demo">
        <img src="/graph.png" alt="Graph View Demo" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e0e0e0' }} />
        <p>노트들이 어떻게 연결되어 있는지 시각적으로 확인하고, 아이디어 간의 관계를 파악하여 새로운 통찰을 얻을 수 있습니다.</p>
      </div>
    )
  },
  {
    id: 'video-conference',
    title: '화상회의',
    description: 'Memoria 내에서 팀원들과 실시간 화상회의를 진행하세요. 화면 공유, 화이트보드, 실시간 자막 등 다양한 협업 도구를 제공합니다.',
    content: (
      <div className="tutorial-content-demo video-conference-demo">
        <div className="video-grid-mock">
          <div className="video-mock user-video">나</div>
          <div className="video-mock">참가자 1</div>
          <div className="video-mock">참가자 2</div>
          <div className="video-mock">참가자 3</div>
        </div>
        <div className="controls-mock">
          <button>음소거</button>
          <button>비디오 끄기</button>
          <button>화면 공유</button>
        </div>
        <p>팀원들과 실시간으로 소통하고 협업할 수 있는 화상회의 기능을 제공합니다.</p>
      </div>
    )
  },
  {
    id: 'offline-meeting',
    title: '오프라인 회의록',
    description: '오프라인 회의 내용을 녹음하거나 파일을 업로드하여 자동으로 텍스트로 변환하고, 회의록을 효율적으로 관리하세요.',
    content: (
      <div className="tutorial-content-demo offline-meeting-demo">
        <div className="upload-area-mock">
          <p>여기에 오디오 파일(.mp3, .wav)을 드래그 앤 드롭하거나 클릭하여 업로드하세요.</p>
          <button>파일 선택</button>
        </div>
        <div className="transcription-mock">
          <p><b>회의록 (자동 변환):</b></p>
          <p>[00:00:05] 안녕하세요, 오늘 회의를 시작하겠습니다.</p>
          <p>[00:00:12] 주요 안건은 프로젝트 진행 상황입니다.</p>
        </div>
        <p>음성 파일을 텍스트로 자동 변환하여 회의록 작성 시간을 단축하고, 중요한 내용을 놓치지 않도록 돕습니다.</p>
      </div>
    )
  },
  {
    id: 'user-profile',
    title: '사용자 프로필',
    description: '개인 정보를 관리하고, 비밀번호를 변경하며, 음성 샘플을 등록하여 AI 기능을 맞춤 설정할 수 있습니다.',
    content: (
      <div className="tutorial-content-demo user-profile-demo">
        <div className="profile-card-mock">
          <img src="/memoria.png" alt="User Avatar" className="avatar-mock" />
          <h4>사용자 이름</h4>
          <p>이메일: user@example.com</p>
          <button>프로필 수정</button>
          <button>비밀번호 변경</button>
          <button>음성 샘플 관리</button>
        </div>
        <p>프로필 정보를 업데이트하고, 보안 설정을 관리하며, 음성 인식 AI를 위한 음성 샘플을 등록할 수 있습니다.</p>
      </div>
    )
  },
  {
    id: 'vault-manager',
    title: '검색 기능 ',
    description: '모든 노트를 체계적으로 관리하고, 필요한 정보를 쉽게 찾을 수 있도록 돕는 강력한 도구입니다.',
    content: (
      <div className="tutorial-content-demo vault-manager-demo">
        <div className="file-list-mock">
          <div className="file-item-mock"><File size={14} /> 2024년 프로젝트 계획</div>
          <div className="file-item-mock"><File size={14} /> 회의록_20240701</div>
          <div className="file-item-mock"><File size={14} /> 아이디어_스케치</div>
          <div className="file-item-mock"><File size={14} /> 개인_일기</div>
        </div>
        <div className="search-bar-mock">
          <input type="text" placeholder="노트 검색..." disabled />
          <button><Search size={16} /></button>
        </div>
        <p>모든 노트를 한곳에서 관리하고, 강력한 검색 기능으로 원하는 정보를 빠르게 찾을 수 있습니다.</p>
      </div>
    )
  },
];

export default function MemoriaTutorialModal({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fadeDirection, setFadeDirection] = useState('in');

  const currentStep = tutorialSteps[currentStepIndex];

  const handleNext = useCallback(() => {
    setFadeDirection('out');
    setTimeout(() => {
      setCurrentStepIndex(prev => Math.min(prev + 1, tutorialSteps.length - 1));
      setFadeDirection('in');
    }, 300); // 애니메이션 시간
  }, []);

  const handlePrev = useCallback(() => {
    setFadeDirection('out');
    setTimeout(() => {
      setCurrentStepIndex(prev => Math.max(prev - 1, 0));
      setFadeDirection('in');
    }, 300); // 애니메이션 시간
  }, []);

  const handleTabClick = useCallback((index) => {
    if (currentStepIndex === index) return;
    setFadeDirection('out');
    setTimeout(() => {
      setCurrentStepIndex(index);
      setFadeDirection('in');
    }, 300); // 애니메이션 시간
  }, [currentStepIndex]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setFadeDirection('in');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="tutorial-modal-overlay">
      <div className="tutorial-modal-content">
        <button className="tutorial-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="tutorial-header">
          <h2 className="tutorial-main-title">Memoria 기능 둘러보기</h2>
          <div className="tutorial-tabs">
            {tutorialSteps.map((step, index) => (
              <button
                key={step.id}
                className={`tutorial-tab-btn ${currentStepIndex === index ? 'active' : ''}`}
                onClick={() => handleTabClick(index)}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>

        <div className={`tutorial-body ${fadeDirection}`}>
          <h3 className="tutorial-step-title">{currentStep.title}</h3>
          <p className="tutorial-step-description">{currentStep.description}</p>
          <div className="tutorial-step-content">
            {currentStep.content}
          </div>
        </div>

        <div className="tutorial-navigation">
          <button onClick={handlePrev} disabled={currentStepIndex === 0} className="tutorial-nav-btn prev">
            <ChevronLeft size={20} /> 이전
          </button>
          <span className="tutorial-step-indicator">
            {currentStepIndex + 1} / {tutorialSteps.length}
          </span>
          <button onClick={handleNext} disabled={currentStepIndex === tutorialSteps.length - 1} className="tutorial-nav-btn next">
            다음 <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}