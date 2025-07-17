// 파일: src/Components/Util/AiActionsWidget.js

import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from '../../Contexts/TabsContext';
import { toast } from 'react-hot-toast';
import memoriaIcon from './Black.png'; 
import './AiActionsWidget.css';
import { generateSummary, translateText, chatWithAI, generateTitleFromContent } from '../Note/note_summary';

// (아이콘 컴포넌트는 수정 없음)
const ActionIcon = ({ path }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path}></path>
    </svg>
);
const MinimizeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14"></path>
    </svg>
);
const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
);

const LANGUAGES = [
  { code: 'Korean', name: '한국어' },
  { code: 'English', name: '영어' },
  { code: 'Japanese', name: '일본어' },
  { code: 'Chinese', name: '중국어' },
];

export default function AiActionsWidget({ onClose, onMinimize, isVisible }) {
  const { notes, updateNote } = useNotes();
  const { activeTabId, noteIdFromTab, updateTitle } = useTabs();
  const [currentNoteContent, setCurrentNoteContent] = useState('');
  
  const [view, setView] = useState('initial'); 
  const [chatHistory, setChatHistory] = useState([]);
  const [resultText, setResultText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [newTitleForResult, setNewTitleForResult] = useState(null);
  const [wasChatCleared, setWasChatCleared] = useState(false);

  const abortControllerRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const currentNoteId = noteIdFromTab(activeTabId);
    if (currentNoteId && notes[currentNoteId]) {
      setCurrentNoteContent(notes[currentNoteId].content);
    } else {
      setCurrentNoteContent('');
    }
  }, [activeTabId, notes, noteIdFromTab]);
  
  
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
    setIsLoading(false);
    setLoadingType(null);
    setSuggestedTitles([]);
    setNewTitleForResult(null);
    setWasChatCleared(false);
  };
  
  const handleChatSubmit = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() !== '' && !isLoading) {
        e.preventDefault();
        
        if (wasChatCleared) {
            setWasChatCleared(false);
        }

        const question = chatInput;
        
        if (view !== 'chat') {
            setView('chat');
        }

        setChatHistory(prev => [...prev, { type: 'user', text: question }]);
        setChatInput('');
        setIsLoading(true);

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const answer = await chatWithAI(question, currentNoteContent, signal);
            setChatHistory(prev => [...prev, { type: 'ai', text: answer }]);
        } catch (error) {
            if (error.name === 'AbortError') {
              console.log('Chat aborted by user.');
              setChatHistory(prev => prev.slice(0, -1));
              return;
            }
            toast.error(`AI 작업 실패: ${error.message}`);
            setChatHistory(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }
  }

  const handleClearChat = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    setChatHistory([]);
    setIsLoading(false);
    setView('initial');
    setWasChatCleared(true);
    toast.success('대화 내용이 초기화되었습니다.');
  };

  const handleTextGeneration = async (type, params) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoadingType(type);
    setView('loading');
    
    try {
        if (type === 'summary') {
            const data = await generateSummary(params.content, signal);
            let plainSummaryText = '';
            try {
                const summaryObject = JSON.parse(data.summary);
                plainSummaryText = summaryObject.full_summary || summaryObject.summary || '';
            } catch (e) {
                plainSummaryText = data.summary;
            }
            setResultText(plainSummaryText);
            setNewTitleForResult(null); 
        } else if (type === 'translate') {
            const currentTitle = noteIdFromTab(activeTabId);
            const data = await translateText(currentTitle, params.content, params.target_language, signal);
            setResultText(data.translated_content);
            setNewTitleForResult(data.translated_title);
        }
        setIsFadingOut(true);
        setTimeout(() => {
            setView('result');
            setIsFadingOut(false);
        }, 300);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Text generation aborted by user.');
            handleGoBack();
            return;
        }
        toast.error(`AI 작업 실패: ${error.message}`);
        handleGoBack();
    } finally {
        abortControllerRef.current = null;
    }
  };
  
  const handleGenerateTitle = async () => {
    const currentNoteId = noteIdFromTab(activeTabId);
    if (!currentNoteId) {
        toast.error("제목을 적용할 노트가 없습니다.");
        return;
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    setLoadingType('title');
    setView('loading');
    try {
        // ✅ [수정] activeNoteContent -> currentNoteContent
        const titles = await generateTitleFromContent(currentNoteContent, signal);
        setSuggestedTitles(titles);
        setView('title-suggestions');
        setLoadingType(null);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('AI title generation was aborted by the user.');
            handleGoBack();
            return;
        }
        toast.error(`AI 제목 생성 실패: ${error.message}`);
        handleGoBack();
    } finally {
        abortControllerRef.current = null;
    }
  };

  const handleSelectTitle = (selectedTitle) => {
    const oldNoteId = noteIdFromTab(activeTabId);
    if (!oldNoteId) {
      toast.error("오류: 제목을 변경할 노트를 찾을 수 없습니다.");
      return;
    }
    // ✅ [수정] activeNoteContent -> currentNoteContent
    const finalTitle = updateNote(oldNoteId, selectedTitle, currentNoteContent);
    if (oldNoteId !== finalTitle) {
        updateTitle(oldNoteId, finalTitle);
    }
    toast.success(`제목이 "${finalTitle}"(으)로 변경되었습니다!`);
    onClose();
  };

  const handleApplyResult = () => {
    const oldNoteId = noteIdFromTab(activeTabId);
    if (!oldNoteId) { toast.error("적용할 노트가 없습니다."); return; }
    if (!resultText) { toast.error("적용할 내용이 없습니다."); return; }
    const titleToApply = newTitleForResult || oldNoteId;
    const finalTitle = updateNote(oldNoteId, titleToApply, resultText);
    if (oldNoteId !== finalTitle) {
      updateTitle(oldNoteId, finalTitle);
    }
    toast.success("노트에 적용되었습니다!");
    onClose();
  };

    return (
    <div className={`ai-actions-widget ${isVisible ? 'visible' : ''}`}>
      <div className="widget-header">
        {view !== 'initial' && view !== 'chat' && (
            <button className="widget-back-button" onClick={handleGoBack}>←</button>
        )}
        <h4 className="widget-title">AI Assistance</h4>
        <div className="widget-header-right">
            {(view === 'chat' || (view === 'initial' && wasChatCleared)) && (
                <button className="widget-refresh-button" onClick={handleClearChat} title="대화 내용 초기화">
                    <RefreshIcon />
                </button>
            )}
            <button className="widget-minimize-button" onClick={onMinimize} title="최소화">
                <MinimizeIcon />
            </button>
            <button className="widget-close-button" onClick={onClose} title="닫기">×</button>
        </div>
      </div>
      
      <div className="widget-content-wrapper">
        <div className="main-content-area" ref={chatContainerRef}>
            {view === 'initial' && (
              <div className={`initial-view-container ${wasChatCleared ? 'cleared-mode' : ''} fade-in`}>
                {wasChatCleared ? (
                  <div className="ai-greeting">
                      <div className="typing-effect cleared-text">
                        열린 탭에 대해 시냅스에게 질문하세요
                        <br />
                        ex) "이 노트를 좀 더 요약해줘"
                      </div>
                  </div>
                ) : (
                  <>
                    <div className="ai-greeting">
                      <div className="ai-icon-background">
                        <img src={memoriaIcon} alt="AI 아이콘" style={{ width: '32px', height: '32px' }} />
                      </div>
                      <h2>무엇을 도와드릴까요?</h2>
                      <p className="ai-service-title">Synapse AI</p>
                    </div>
                    <div className="action-button-group">
                      <button className="action-button" onClick={() => handleTextGeneration('summary', { content: currentNoteContent})}>
                          <ActionIcon path="M3 6h18M3 12h18M3 18h18" /><span>페이지에서 요약문 생성</span>
                      </button>
                      <button className="action-button" onClick={handleGenerateTitle}>
                          <ActionIcon path="M6 4h12v16l-6-4-6 4z" /><span>Synapse로 제목 생성</span>
                      </button>
                      <button className="action-button" onClick={() => setView('translate')}>
                          <ActionIcon path="M5 12h14M12 5l7 7-7 7" /><span>이 페이지 번역</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {view === 'chat' && (
                <div className="chat-history-wrapper fade-in">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.type}`}>
                    <p>{msg.text}</p>
                    </div>
                ))}
                {isLoading && (<div className="chat-message ai"><p>Synapse가 생각 중입니다...</p></div>)}
                </div>
            )}
            
            {view === 'title-suggestions' && (
                <div className="title-suggestions-view fade-in">
                    <p className="translate-guide">Synapse가 추천하는 제목입니다.</p>
                    <div className="action-button-group vertical">
                        {suggestedTitles.map((title, index) => (
                          <button key={index} className="action-button" onClick={() => handleSelectTitle(title)}>
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
                          // ✅ [수정] activeNoteContent -> currentNoteContent
                          onClick={() => handleTextGeneration('translate', { content: currentNoteContent, target_language: lang.code })}>
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
            
            {view === 'loading' && (
                <div className={`loading-view-full ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
                    {loadingType === 'title' && (
                        <div className="title-loader-wrapper">
                            <div className="loader-text">Synapse가 제목을 구상 중입니다...</div>
                            <div className="typing-effect">Thinking of a good title...</div>
                        </div>
                    )}
                    {(loadingType === 'summary' || loadingType === 'chat') && (
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
                    placeholder="Synapse에게 노트에 대해 물어보기"
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