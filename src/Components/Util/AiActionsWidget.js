// 파일: src/Components/Util/AiActionsWidget.js

import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from '../../Contexts/TabsContext';
import { toast } from 'react-hot-toast';
import './AiActionsWidget.css';
import { generateSummary, translateText, chatWithAI, generateTitleFromContent } from '../Note/note_summary';

const ActionIcon = ({ path }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path}></path>
    </svg>
);

const LANGUAGES = [
  { code: 'English', name: '영어' },
  { code: 'Japanese', name: '일본어' },
  { code: 'Chinese', name: '중국어' },
];

// ✅ [수정] AiActionsWidget 컴포넌트 전체를 아래 코드로 교체해주세요.
export default function AiActionsWidget({ onClose }) {
  const { activeNoteContent, updateNote } = useNotes();
  const { activeTabId, noteIdFromTab, updateTitle } = useTabs();
  
  const [view, setView] = useState('initial'); 
  const [chatHistory, setChatHistory] = useState([]);
  const [resultText, setResultText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [newTitleForResult, setNewTitleForResult] = useState(null);

  const abortControllerRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, view, suggestedTitles]);

  const handleGoBack = () => { 
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    setView('initial'); 
    setChatHistory([]); 
    setResultText('');
    setIsLoading(false);
    setLoadingType(null);
    setSuggestedTitles([]);
    setNewTitleForResult(null); // ✅ [추가] 상태 초기화
  };
  
  const handleChatSubmit = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() !== '') {
        e.preventDefault();
        const question = chatInput;
        
        if (chatHistory.length === 0) {
            setView('chat');
        }

        setChatHistory(prev => [...prev, { type: 'user', text: question }]);
        setChatInput('');
        setIsLoading(true);

        try {
            const answer = await chatWithAI(question, activeNoteContent);
            setChatHistory(prev => [...prev, { type: 'ai', text: answer }]);
        } catch (error) {
            toast.error(`AI 작업 실패: ${error.message}`);
            setChatHistory(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    }
  }

   const handleTextGeneration = async (type, params) => {
    setLoadingType(type);
    setView('loading');
    try {
        if (type === 'summary') {
            const data = await generateSummary(params.content);
            setResultText(data.summary);
            // 요약 기능은 제목을 바꾸지 않으므로 null로 설정
            setNewTitleForResult(null); 
        } else if (type === 'translate') {
            // 현재 노트의 제목을 가져옵니다.
            const currentTitle = noteIdFromTab(activeTabId);
            // 번역 API에 제목과 내용을 모두 전달합니다.
            const data = await translateText(currentTitle, params.content, params.target_language);
            setResultText(data.translated_content);
            setNewTitleForResult(data.translated_title); // 번역된 제목을 상태에 저장
        }

        setIsFadingOut(true);
        setTimeout(() => {
            setView('result');
            setIsFadingOut(false);
        }, 300);
    } catch (error) {
        toast.error(`AI 작업 실패: ${error.message}`);
        handleGoBack();
    }
  };
  
  const handleGenerateTitle = async () => {
    const currentNoteId = noteIdFromTab(activeTabId);
    if (!currentNoteId) {
        toast.error("제목을 적용할 노트가 없습니다.");
        return;
    }

    // ✅ [추가] 새로운 AbortController를 생성하고 참조에 저장합니다.
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;


    setLoadingType('title');
    setView('loading');

    try {
        // ✅ [수정] API 호출 함수에 signal을 전달합니다.
        const titles = await generateTitleFromContent(activeNoteContent, signal);
        
        // 요청이 성공적으로 완료되면 AbortController 참조를 초기화합니다.
        abortControllerRef.current = null;

        setSuggestedTitles(titles);
        setView('title-suggestions');
        setLoadingType(null);
    } catch (error) {
        // ✅ [추가] AbortError는 사용자가 취소한 것이므로 조용히 처리합니다.
        if (error.name === 'AbortError') {
            console.log('AI title generation was aborted by the user.');
            return; // 함수 실행 종료
        }
        toast.error(`AI 제목 생성 실패: ${error.message}`);
        handleGoBack();
    }
  };

  const handleSelectTitle = (selectedTitle) => {
  // 1. 현재 활성화된 탭의 "노트 ID (이전 제목)"를 가져옵니다.
  const oldNoteId = noteIdFromTab(activeTabId);
  if (!oldNoteId) {
    toast.error("오류: 제목을 변경할 노트를 찾을 수 없습니다.");
    return;
  }

  // 2. NotesContext를 통해 노트 데이터를 업데이트하고, 중복 처리된 "최종 제목"을 받습니다.
  const finalTitle = updateNote(oldNoteId, selectedTitle, activeNoteContent);

  // 3. TabsContext의 updateTitle을 호출하여 "이전 제목"을 "최종 제목"으로 변경합니다.
  //    (이제 updateTitle은 noteId를 기준으로 동작하므로 올바르게 작동합니다)
  if (oldNoteId !== finalTitle) {
      updateTitle(oldNoteId, finalTitle);
  }
  
  toast.success(`제목이 "${finalTitle}"(으)로 변경되었습니다!`);
  onClose(); // 위젯 닫기
};

  const handleApplyResult = () => {
    const oldNoteId = noteIdFromTab(activeTabId);
    if (!oldNoteId) { toast.error("적용할 노트가 없습니다."); return; }
    if (!resultText) { toast.error("적용할 내용이 없습니다."); return; }

    // 적용할 제목을 결정합니다. (번역된 제목이 있으면 사용, 없으면 기존 제목 유지)
    const titleToApply = newTitleForResult || oldNoteId;

    // 노트 내용과 제목을 한 번에 업데이트합니다.
    const finalTitle = updateNote(oldNoteId, titleToApply, resultText);
    
    // 탭 제목도 업데이트합니다.
    if (oldNoteId !== finalTitle) {
      updateTitle(oldNoteId, finalTitle);
    }

    toast.success("노트에 적용되었습니다!");
    onClose();
  };

  return (
    <div className="ai-actions-widget">
      <div className="widget-header">
        {view !== 'initial' && (
            <button className="widget-back-button" onClick={handleGoBack}>←</button>
        )}
        <h4 className="widget-title">AI 도우미</h4>
        <div className="widget-header-right">
            <button className="widget-close-button" onClick={onClose}>×</button>
        </div>
      </div>
      
      <div className="widget-content-wrapper">
        <div className="main-content-area" ref={chatContainerRef}>
            <div className={`initial-view-container ${view !== 'initial' ? 'fade-out' : 'fade-in'}`}>
              <div className="ai-greeting">
                  <div className="ai-icon-background"><ActionIcon path="M12 18V6M6 12h12" /></div>
                  <h2>무엇을 도와드릴까요?</h2>
                  <p className="ai-service-title">AI Services</p>
              </div>
              <div className="action-button-group">
                  <button className="action-button" onClick={() => handleTextGeneration('summary', { content: activeNoteContent })}>
                      <ActionIcon path="M3 6h18M3 12h18M3 18h18" /><span>페이지에서 요약문 생성</span>
                  </button>
                  <button className="action-button" onClick={handleGenerateTitle}>
                      <ActionIcon path="M12 15l-3.5-3.5a6 6 0 0 1 8-8L12 8" /><span>AI로 제목 생성</span>
                  </button>
                  <button className="action-button" onClick={() => setView('translate')}>
                      <ActionIcon path="M5 12h14M12 5l7 7-7 7" /><span>이 페이지 번역</span>
                  </button>
              </div>
            </div>

            <div className={`chat-history-wrapper ${view === 'chat' ? 'fade-in' : ''}`}>
              {chatHistory.map((msg, index) => (
                  <div key={index} className={`chat-message ${msg.type}`}><p>{msg.text}</p></div>
              ))}
              {isLoading && (<div className="chat-message ai"><p>AI가 생각 중입니다...</p></div>)}
            </div>
            
            {view === 'title-suggestions' && (
                <div className="title-suggestions-view fade-in">
                    <p className="translate-guide">AI가 추천하는 제목입니다.</p>
                    <div className="action-button-group vertical">
                        {suggestedTitles.map((title, index) => (
                          <button 
                            key={index} 
                            className="action-button"
                            onClick={() => handleSelectTitle(title)}
                          >
                            {title}
                          </button>
                        ))}
                    </div>
                </div>
            )}

            {view === 'translate' && (
              <div className="translate-view fade-in">
                  <p className="translate-guide">어떤 언어로 번역할까요?</p>
                  <div className="language-options">
                      {LANGUAGES.map((lang) => (
                        <button key={lang.code} className="language-button" 
                          onClick={() => handleTextGeneration('translate', { content: activeNoteContent, target_language: lang.code })}>
                          {lang.name}
                        </button>
                      ))}
                  </div>
              </div>
            )}
            {view === 'result' && (
              <div className="result-only-view fade-in">
                <p>{resultText}</p>
                <div className="result-apply-button-container">
                  <button className="apply-to-note-button" onClick={handleApplyResult}>
                      현재 노트에 적용
                  </button>
                </div>
              </div>
            )}
            
            {/* 로딩 뷰 렌더링 부분을 수정합니다. */}
            {view === 'loading' && (
                <div className={`loading-view-full ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
                    
                    {/* ❗❗❗ [핵심 수정] 새로운 AI 제목 생성 로딩 애니메이션 적용 ❗❗❗ */}
                    {loadingType === 'title' && (
                        <div className="title-loader-wrapper">
                            <div className="loader-text">AI가 제목을 구상 중입니다...</div>
                            <div className="typing-effect">Thinking of a good title...</div>
                        </div>
                    )}

                    {loadingType === 'summary' && (
                        <div className="summary-loader">
                            <div className="loader-text">요약 중...</div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                        </div>
                    )}
                    {loadingType === 'translate' && (
                        <div className="translate-loader-wrapper">
                             <div className="loader-text">번역 중...</div>
                            <div className="translate-loader">
                                <div className="lang-icon-container">
                                    <div className="lang-icon" id="lang-icon-left">A</div>
                                    <div className="lang-icon" id="lang-icon-right">文</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {(view === 'initial' || view === 'chat') && (
            <div className="chat-input-container-bottom">
                <textarea
                    className="chat-input"
                    placeholder="AI에게 노트에 대해 물어보기"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatSubmit}
                    rows={1}
                />
            </div>
        )}

      </div>
    </div>
  );
}