import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from '../../Contexts/TabsContext';
import { useGroups } from '../../Contexts/GroupContext';
import { toast } from 'react-hot-toast';
import memoriaIcon from './Black.png';
import './AiActionsWidget.css';
import {
    suggestKeywords,
    generateSummaryWithKeywords,
    analyzeKeywordInContext,
    translateText,
    chatWithAI,
    generateTitleFromContent
} from '../Note/note_AIassist';
import ReactMarkdown from 'react-markdown';

// 아이콘 컴포넌트
const ActionIcon = ({ path }) => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path}></path></svg> );
const MinimizeIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path></svg> );
const RefreshIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> );
const HistoryIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>);

// 날짜/시간 관련 헬퍼 함수
const formatTime = (timestamp) => {
  if (!timestamp) return ''; 
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
};
const isSameDay = (ts1, ts2) => {
    if (!ts1 || !ts2) return false;
    const date1 = new Date(ts1);
    const date2 = new Date(ts2);
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

const LANGUAGES = [
  { code: 'Korean', name: '한국어' }, { code: 'English', name: '영어' },
  { code: 'Japanese', name: '일본어' }, { code: 'Chinese', name: '중국어' },
];

const loadChatHistoriesFromStorage = () => {
    try {
        const histories = localStorage.getItem('chatHistories');
        return histories ? JSON.parse(histories) : {};
    } catch (error) {
        console.error("채팅 기록 불러오기 실패:", error);
        return {};
    }
};

const saveChatHistoryToStorage = (noteId, groupId, title, history) => {
    try {
        if (!noteId || !groupId) return;
        const allHistories = loadChatHistoriesFromStorage();
        allHistories[noteId] = { history, groupId, title };
        localStorage.setItem('chatHistories', JSON.stringify(allHistories));
    } catch (error) {
        console.error("채팅 기록 저장 실패:", error);
    }
};

export default function AiActionsWidget({ onClose, onMinimize, isVisible }) {
  const { notes, setNotes, setLinks, upsertNote, links, createOrAppendKeywordNote, loading: notesLoading, loadNotes } = useNotes();
  const { activeTabId, noteIdFromTab, openTab, updateTitle } = useTabs();
  const { selectedGroupId, setSelectedGroupId, groups } = useGroups();
  
  const [currentNoteContent, setCurrentNoteContent] = useState('');
  const [view, setView] = useState('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [resultDataForApply, setResultDataForApply] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [wasChatCleared, setWasChatCleared] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [suggestedKeywords, setSuggestedKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState(new Set());
  const [aiRecommendedKeywords, setAiRecommendedKeywords] = useState(new Set());
  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [isRegeneratingKeywords, setIsRegeneratingKeywords] = useState(false);
  const [forceChatViewForNote, setForceChatViewForNote] = useState(null);

  const abortControllerRef = useRef(null);
  const currentLoadingToastId = useRef(null); 
  const chatContainerRef = useRef(null);

  const currentNoteId = useMemo(() => noteIdFromTab(activeTabId), [activeTabId, noteIdFromTab]);

  useEffect(() => {
    if (currentNoteId && notes && notes[currentNoteId]) {
      setCurrentNoteContent(notes[currentNoteId].content);
      const allHistories = loadChatHistoriesFromStorage();
      const loadedData = allHistories[currentNoteId];
      const validHistory = (loadedData && Array.isArray(loadedData.history)) ? loadedData.history : [];
      setChatHistory(validHistory);
      
      setWasChatCleared(false);
      
      if (forceChatViewForNote === currentNoteId) {
        setView('chat');
        setForceChatViewForNote(null); // 히스토리에서 특정 채팅으로 점프할 때만 'chat' 뷰
      } 
      else {
        // 그 외 모든 경우(위젯을 닫았다 다시 켜는 경우 포함)에는 무조건 'initial' 뷰로 시작
        setView('initial');
      }

    } else if (!notesLoading) {
      setCurrentNoteContent('');
      setChatHistory([]);
      setView('initial');
    }
  }, [currentNoteId, notes, notesLoading, forceChatViewForNote]);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      if (view === 'chat' || view === 'history') {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      } else {
        chatContainerRef.current.scrollTop = 0;
      }
    }
  }, [chatHistory, view, previewPage]);

  const handleGoBack = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentLoadingToastId.current) {
        toast.dismiss(currentLoadingToastId.current);
        currentLoadingToastId.current = null;
    }
    
    setIsLoading(false);
    setLoadingType(null);
    setResultDataForApply(null);
    setSuggestedKeywords([]);
    setSelectedKeywords(new Set());
    setAiRecommendedKeywords(new Set());
    setSuggestedTitles([]);
    setPreviewPage(0);
    setIsRegeneratingKeywords(false);

    setView('initial');
  };

  const handleMinimizeClick = () => onMinimize();

  // ▼▼▼ 수정된 부분 ▼▼▼
  const handleCloseClick = () => {
    handleGoBack(); // 모든 상태를 초기화하는 함수를 먼저 호출
    onClose();      // 그 다음에 위젯을 닫습니다.
  };
  // ▲▲▲ 여기까지 ▲▲▲

  const handleChatSubmit = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() !== '' && !isLoading) {
        e.preventDefault();
        const question = chatInput.trim();
        setChatInput('');
        setView('chat');
        setWasChatCleared(false);
        
        const currentHistory = Array.isArray(chatHistory) ? chatHistory : [];
        
        const newHistoryWithUser = [...currentHistory, { 
            type: 'user', 
            text: question,
            timestamp: new Date().toISOString()
        }];
        setChatHistory(newHistoryWithUser);
        
        setIsLoading(true);
        setLoadingType('chat');
        currentLoadingToastId.current = toast.loading('Synapse가 생각 중입니다...');
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        try {
            const answer = await chatWithAI(question, currentNoteContent, signal);
            
            setChatHistory(prev => {
                const prevHistory = Array.isArray(prev) ? prev : [];
                const newHistoryWithAI = [...prevHistory, { 
                    type: 'ai', 
                    text: answer,
                    timestamp: new Date().toISOString()
                }];
                saveChatHistoryToStorage(currentNoteId, selectedGroupId, currentNoteId, newHistoryWithAI);
                return newHistoryWithAI;
            });

            toast.success('답변 생성 완료!', { id: currentLoadingToastId.current });
        } catch (error) {
            if (error.name !== 'AbortError') toast.error(`AI 작업 실패: ${error.message}`, { id: currentLoadingToastId.current });
        } finally {
            setIsLoading(false);
            setLoadingType(null);
            abortControllerRef.current = null;
            currentLoadingToastId.current = null;
        }
    }
  }

  const handleClearChat = () => {
    setChatHistory([]);
    saveChatHistoryToStorage(currentNoteId, selectedGroupId, currentNoteId, []);
    setView('initial');
    setWasChatCleared(true);
    toast.success('대화 내용이 초기화되었습니다.');
  };

  const handleLoadHistory = (noteToLoadId, groupId) => {
    setForceChatViewForNote(noteToLoadId);

    if (String(groupId) === String(selectedGroupId)) {
      openTab({ title: noteToLoadId, type: 'note', noteId: noteToLoadId });
    } else {
      const groupName = groupNameMap[groupId] || `ID: ${groupId}`;
      toast(`'${groupName}' 그룹으로 이동합니다...`, { icon: '➡️' });
      setSelectedGroupId(groupId);
      loadNotes(groupId).then(() => {
        openTab({ title: noteToLoadId, type: 'note', noteId: noteToLoadId });
      });
    }
  };

  const groupNameMap = useMemo(() => {
    const map = {};
    if (groups && typeof groups === 'object') {
        Object.values(groups).forEach(group => {
            map[group.group_id] = group.name;
        });
    }
    return map;
  }, [groups]);

  const historyLogData = useMemo(() => {
    if (view !== 'history') return [];
    const allHistories = loadChatHistoriesFromStorage();
    return Object.entries(allHistories)
      .filter(([, data]) => data.history && data.history.length > 0)
      .map(([noteId, data]) => {
        const firstUserQuestion = data.history.find(msg => msg.type === 'user');
        let title = firstUserQuestion ? firstUserQuestion.text : data.title;
        if (title.length > 30) {
          title = title.substring(0, 30) + '...';
        }
        const groupName = groupNameMap[data.groupId] || `ID: ${data.groupId}`;
        return { noteId, title, groupId: data.groupId, groupName };
      })
      .reverse();
  }, [view, groupNameMap]);

  const handleStartSummaryProcess = async () => {
    if (!currentNoteContent) {
        toast.error("요약할 노트 내용이 없습니다.");
        return;
    }
    setView('loading');
    setLoadingType('summary');
    
    currentLoadingToastId.current = toast.loading('AI가 키워드를 추천 중입니다...'); 

    abortControllerRef.current = new AbortController();
    try {
        const data = await suggestKeywords(currentNoteContent, abortControllerRef.current.signal);
        setSuggestedKeywords(data.all_keywords || []);
        const recommended = new Set(data.recommended_keywords || []);
        setAiRecommendedKeywords(recommended);
        setSelectedKeywords(recommended);
        setView('keyword-selection');
        toast.success('키워드 추천 완료!', { id: currentLoadingToastId.current });
    } catch (error) {
        if (error.name !== 'AbortError') toast.error(`AI 작업 실패: ${error.message}`, { id: currentLoadingToastId.current });
        handleGoBack();
    } finally {
        setLoadingType(null);
        currentLoadingToastId.current = null;
    }
  };

  const handleRegenerateKeywords = async () => {
      if (!currentNoteContent || isRegeneratingKeywords) return;

      setIsRegeneratingKeywords(true);
      const toastId = toast.loading('AI가 키워드를 다시 추천 중입니다...');
      abortControllerRef.current = new AbortController();

      try {
          const data = await suggestKeywords(currentNoteContent, abortControllerRef.current.signal);
          setSuggestedKeywords(data.all_keywords || []);
          const recommended = new Set(data.recommended_keywords || []);
          setAiRecommendedKeywords(recommended);
          setSelectedKeywords(recommended);
          toast.success('새로운 키워드를 추천했습니다!', { id: toastId });
      } catch (error) {
          if (error.name !== 'AbortError') {
              toast.error(`키워드 재추천 실패: ${error.message}`, { id: toastId });
          } else {
              toast.dismiss(toastId);
          }
      } finally {
          setIsRegeneratingKeywords(false);
          abortControllerRef.current = null;
      }
  };

  const handleKeywordToggle = (keyword) => {
    setSelectedKeywords(prev => {
        const newSet = new Set(prev);
        newSet.has(keyword) ? newSet.delete(keyword) : newSet.add(keyword);
        return newSet;
    });
  };

  const handleSelectAllKeywords = () => {
    if (selectedKeywords.size === suggestedKeywords.length) {
        setSelectedKeywords(new Set());
    } else {
        setSelectedKeywords(new Set(suggestedKeywords));
    }
  };

  const handleConfirmKeywords = async () => {
    if (selectedKeywords.size === 0) {
      toast.error("하나 이상의 키워드를 선택해주세요.");
      return;
    }
    setView('loading');
    setLoadingType('summary');
    
    currentLoadingToastId.current = toast.loading('AI가 요약 및 분석 내용을 생성 중입니다...'); 
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
        const finalKeywords = Array.from(selectedKeywords);
        const summaryResult = await generateSummaryWithKeywords(currentNoteContent, finalKeywords, signal);
        const sourceNoteTitle = notes[currentNoteId]?.title || currentNoteId;
        const keywordContentPromises = finalKeywords.map(keyword =>
            analyzeKeywordInContext(currentNoteContent, keyword, 'Korean', null, signal, sourceNoteTitle)
        );
        const keywordContents = await Promise.all(keywordContentPromises);
        
        const keywordDataMap = {};
        finalKeywords.forEach((keyword, index) => {
            keywordDataMap[keyword] = keywordContents[index];
        });

        setResultDataForApply({
            type: 'summary',
            summaryContent: summaryResult.summary,
            keywordMap: keywordDataMap
        });
        setPreviewPage(0);

        toast.success('AI 생성 완료! 결과를 확인하고 적용하세요.', { id: currentLoadingToastId.current });
        setView('result');

    } catch (error) {
        if (error.name !== 'AbortError') toast.error(`AI 생성 실패: ${error.message}`, { id: currentLoadingToastId.current });
        handleGoBack();
    } finally {
        setLoadingType(null);
        currentLoadingToastId.current = null;
    }
  };

  const handleApplyAndCreateNotes = async () => {
    const oldNoteKey = noteIdFromTab(activeTabId);
    const oldNote = notes[oldNoteKey];

    if (!oldNote || !resultDataForApply || !selectedGroupId) {
        toast.error("적용할 노트, 데이터 또는 그룹을 찾을 수 없습니다.");
        return;
    }

    setIsLoading(true);
    currentLoadingToastId.current = toast.loading('현재 노트에 요약문을 적용 중입니다...'); 

    try {
        const { summaryContent, keywordMap } = resultDataForApply;
        
        await upsertNote(selectedGroupId, oldNote.title, summaryContent, oldNote.note_id, oldNote.title);
        toast.success(`"${oldNote.title}" 노트 업데이트 완료!`, { id: currentLoadingToastId.current });

        const newNotesData = {};
        const keywords = Object.keys(keywordMap);
        currentLoadingToastId.current = toast.loading(`${keywords.length}개의 키워드 노트 생성/업데이트 중...`); 

        for (const keyword of keywords) {
            const newSegmentContent = keywordMap[keyword];
            const keywordResponse = await createOrAppendKeywordNote(selectedGroupId, keyword, newSegmentContent);

            newNotesData[keyword] = {
                content: keywordResponse.content, 
                note_id: keywordResponse.noteId,
                title: keyword
            };
        }
        toast.success(`모든 키워드 노트 처리 완료!`, { id: currentLoadingToastId.current });

        setNotes(prevNotes => ({
            ...prevNotes,
            [oldNote.title]: { ...prevNotes[oldNote.title], content: summaryContent },
            ...newNotesData
        }));
        
        const newLinksFromSummary = Object.keys(keywordMap).map(keyword => ({
            source: oldNote.title,
            target: keyword
        }));

        setLinks(prevLinks => {
            const filteredLinks = prevLinks.filter(link => link.source !== oldNote.title);
            return [...filteredLinks, ...newLinksFromSummary];
        });

        onClose();

    } catch (error) {
        toast.error(`저장 중 오류 발생: ${error.message}`, { id: currentLoadingToastId.current });
    } finally {
        setIsLoading(false);
        currentLoadingToastId.current = null;
    }
  };


  const handleGenerateTitle = async () => {
    const currentNoteKey = noteIdFromTab(activeTabId);
    if (!currentNoteKey || !notes[currentNoteKey]) {
        toast.error("제목을 적용할 노트가 없습니다.");
        return;
    }
    setView('loading');
    setLoadingType('title');
    
    currentLoadingToastId.current = toast.loading("Synapse가 제목을 구상 중입니다..."); 
    
    abortControllerRef.current = new AbortController();
    try {
        const titles = await generateTitleFromContent(currentNoteContent, abortControllerRef.current.signal);
        setSuggestedTitles(titles);
        setView('title-suggestions');
        toast.success('제목 생성 완료!', { id: currentLoadingToastId.current });
    } catch (error) {
        if (error.name !== 'AbortError') toast.error(`AI 제목 생성 실패: ${error.message}`, { id: currentLoadingToastId.current });
        handleGoBack();
    } finally {
        setLoadingType(null);
        currentLoadingToastId.current = null;
    }
  };
  
  const handleSelectTitle = async (selectedTitle) => {
    const oldNoteKey = noteIdFromTab(activeTabId);
    const noteToUpdate = notes[oldNoteKey];

    if (!noteToUpdate || !selectedGroupId) {
      toast.error("오류: 제목을 변경할 노트를 찾거나 그룹을 찾을 수 없습니다.");
      return;
    }

    setIsLoading(true);
    currentLoadingToastId.current = toast.loading("제목 변경 중..."); 

    try {
        await upsertNote(
            selectedGroupId, 
            selectedTitle, 
            noteToUpdate.content, 
            noteToUpdate.note_id, 
            oldNoteKey 
        );
        
        updateTitle(oldNoteKey, selectedTitle);
        toast.success(`제목이 "${selectedTitle}"(으)로 변경되었습니다!`, { id: currentLoadingToastId.current });
        onClose();
    } catch (error) {
        toast.error(`제목 변경 실패: ${error.message}`, { id: currentLoadingToastId.current });
    } finally {
        setIsLoading(false);
        currentLoadingToastId.current = null;
    }
  };

  const handleTranslate = async (targetLanguage) => {
    setView('loading');
    setLoadingType('translate');
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    currentLoadingToastId.current = toast.loading('번역할 노트 목록을 찾는 중...'); 

    try {
        const currentNoteKey = noteIdFromTab(activeTabId);
        if (!currentNoteKey || !notes[currentNoteKey]) {
            throw new Error("번역할 현재 노트를 찾을 수 없습니다.");
        }

        const linkedKeywordTitles = links
            .filter(link => link.source === currentNoteKey)
            .map(link => link.target);
        const notesToTranslate = [currentNoteKey, ...new Set(linkedKeywordTitles)];
        
        toast.loading(`${notesToTranslate.length}개의 노트를 번역 중...`, { id: currentLoadingToastId.current }); 

        const translationPromises = notesToTranslate.map(title => {
            const content = notes[title]?.content || '';
            return translateText(title, content, targetLanguage, signal)
                .then(result => ({
                    originalTitle: title,
                    translatedTitle: result.translated_title,
                    translatedContent: result.translated_content
                }));
        });

        const translationResults = await Promise.all(translationPromises);
        
        setResultDataForApply({
            type: 'translation',
            translations: translationResults
        });
        setPreviewPage(0);

        toast.success('번역 완료! 결과를 확인하세요.', { id: currentLoadingToastId.current });
        setView('result');

    } catch (error) {
        if (error.name !== 'AbortError') {
            toast.error(`번역 실패: ${error.message}`, { id: currentLoadingToastId.current });
        }
        handleGoBack();
    } finally {
        setLoadingType(null);
        currentLoadingToastId.current = null;
    }
  };

  const handleApplyTranslations = async () => {
      if (!resultDataForApply || resultDataForApply.type !== 'translation' || !selectedGroupId) {
          toast.error("적용할 번역 데이터가 없거나 그룹이 선택되지 않았습니다.");
          return;
      }

      setIsLoading(true);
      currentLoadingToastId.current = toast.loading(`${resultDataForApply.translations.length}개의 새로운 번역 노드를 생성 중...`); 

      try {
          const newNotesData = {};
          const titleTranslationMap = new Map();
          resultDataForApply.translations.forEach(item => titleTranslationMap.set(item.originalTitle, item.translatedTitle));

          const processedTranslations = resultDataForApply.translations.map(item => {
              let correctedContent = item.translatedContent;
              titleTranslationMap.forEach((newTitle, oldTitle) => {
                  const oldLinkRegex = new RegExp(`\\[\\[${oldTitle.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\]\\]`, 'g');
                  correctedContent = correctedContent.replace(oldLinkRegex, `[[${newTitle}]]`);
              });
              return { ...item, translatedContent: correctedContent };
          });

          for (const item of processedTranslations) {
              const { translatedTitle, translatedContent } = item;
              const { noteId: newNoteId } = await upsertNote(
                  selectedGroupId,
                  translatedTitle,
                  translatedContent,
                  null
              );
              newNotesData[translatedTitle] = {
                  content: translatedContent,
                  note_id: newNoteId,
                  title: translatedTitle
              };
          }
          toast.success('모든 번역 노트 생성 완료!', { id: currentLoadingToastId.current });

          currentLoadingToastId.current = toast.loading('새로운 링크를 생성 중...'); 
          
          const originalSummaryTitle = resultDataForApply.translations[0].originalTitle;
          const newSummaryTitle = titleTranslationMap.get(originalSummaryTitle);

          const newLinks = links
            .filter(link => link.source === originalSummaryTitle && titleTranslationMap.has(link.target))
            .map(link => ({
                source: newSummaryTitle,
                target: titleTranslationMap.get(link.target)
            }))
            .filter(link => link.source && link.target);

          setNotes(prev => ({ ...prev, ...newNotesData }));
          setLinks(prev => [ ...prev, ...newLinks ]);
          
          toast.success('새로운 링크 생성 완료!', { id: currentLoadingToastId.current });

          openTab({ title: newSummaryTitle, type: 'note', noteId: newSummaryTitle });
          onClose();

      } catch (error) {
          toast.error(`번역 적용 실패: ${error.message}`, { id: currentLoadingToastId.current });
      } finally {
          setIsLoading(false);
          currentLoadingToastId.current = null;
      }
  };

  const handlePrevPage = () => {
    setPreviewPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if (!currentPreviewData) return;
    setPreviewPage(prev => Math.min(currentPreviewData.totalPages - 1, prev + 1));
  };
  
  const currentPreviewData = useMemo(() => {
    if (!resultDataForApply) return null;

    if (resultDataForApply.type === 'summary') {
        const orderedKeywords = Object.keys(resultDataForApply.keywordMap);
        const totalPages = 1 + orderedKeywords.length;
        if (previewPage === 0) {
            const title = "요약문";
            return { title, content: resultDataForApply.summaryContent, totalPages };
        }
        const keywordIndex = previewPage - 1;
        if (keywordIndex < orderedKeywords.length) {
            const keyword = orderedKeywords[keywordIndex];
            return { title: `키워드: ${keyword}`, content: resultDataForApply.keywordMap[keyword], totalPages };
        }
    }

    if (resultDataForApply.type === 'translation') {
        const totalPages = resultDataForApply.translations.length;
        const translationItem = resultDataForApply.translations[previewPage];
        if (translationItem) {
            const title = previewPage === 0 ? "메인 노트 번역" : `키워드 '${translationItem.originalTitle}' 번역`;
            return { title: title, content: `## ${translationItem.translatedTitle}\n\n${translationItem.translatedContent}`, totalPages };
        }
    }

    return null;
  }, [resultDataForApply, previewPage]);

  const isValidChatHistory = Array.isArray(chatHistory);

  return (
    <div className={`ai-actions-widget ${isVisible ? 'visible' : ''}`}>
      <div className="widget-header">
        {view !== 'initial' && (
          <button className="widget-back-button" onClick={handleGoBack}>←</button>
        )}
        <h4 className="widget-title">AI Assistance</h4>
        <div className="widget-header-right">
          {view === 'chat' && isValidChatHistory && chatHistory.length > 0 && !isLoading && (
            <button className="widget-refresh-button" onClick={handleClearChat} title="대화 내용 초기화">
              <RefreshIcon />
            </button>
          )}
          <button className="widget-minimize-button" onClick={handleMinimizeClick} title="최소화">
            <MinimizeIcon />
          </button>
          <button className="widget-close-button" onClick={handleCloseClick} title="닫기">
            ×
          </button>
        </div>
      </div>
      
      <div className="widget-content-wrapper">
        <div className="main-content-area" ref={chatContainerRef}>
            
            {view === 'initial' && (
              <div className={`initial-view-container ${wasChatCleared ? 'cleared-mode' : ''} fade-in`}>
                {wasChatCleared ? (
                  <div className="ai-greeting centered">
                      <div className="typing-effect cleared-text">
                        대화가 초기화 되었습니다.<br/>다시 질문해주세요.
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
                      <button className="action-button" onClick={handleStartSummaryProcess} disabled={!currentNoteContent || isLoading}>
                          <ActionIcon path="M3 6h18M3 12h18M3 18h18" /><span>페이지에서 요약문 생성</span>
                      </button>
                      <button className="action-button" onClick={handleGenerateTitle} disabled={!currentNoteContent || isLoading}>
                          <ActionIcon path="M6 4h12v16l-6-4-6 4z" /><span>Synapse로 제목 생성</span>
                      </button>
                      <button className="action-button" onClick={() => setView('translate')} disabled={!currentNoteContent || isLoading}>
                          <ActionIcon path="M5 12h14M12 5l7 7-7 7" /><span>이 페이지 번역</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {view === 'chat' && isValidChatHistory && (
              <div className="chat-history-wrapper fade-in">
                {chatHistory.length > 0 ? (
                  chatHistory.map((msg, index) => {
                    const prevTimestamp = index > 0 ? chatHistory[index - 1].timestamp : null;
                    const showDateSeparator = index === 0 || !isSameDay(msg.timestamp, prevTimestamp);

                    return (
                        <React.Fragment key={index}>
                            {showDateSeparator && (
                                <div className="chat-date-separator">
                                    <span>{formatDate(msg.timestamp)}</span>
                                </div>
                            )}
                            <div className={`chat-message-wrapper ${msg.type}`}>
                                {msg.type === 'ai' && <span className="chat-message-time">{formatTime(msg.timestamp)}</span>}
                                <div className={`chat-message ${msg.type}`}>
                                    {msg.type === 'ai' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : <p>{msg.text}</p>}
                                </div>
                                {msg.type === 'user' && <span className="chat-message-time">{formatTime(msg.timestamp)}</span>}
                            </div>
                        </React.Fragment>
                    );
                  })
                ) : (
                  !isLoading && (
                    <div className="ai-greeting centered">
                      <div className="ai-icon-background">
                        <img src={memoriaIcon} alt="AI 아이콘" style={{ width: '32px', height: '32px' }} />
                      </div>
                      <p className="typing-effect">현재 노트에 대해 무엇이든 물어보세요.</p>
                    </div>
                  )
                )}
                {isLoading && loadingType === 'chat' && (
                  <div className="chat-message ai">
                    <p>Synapse가 생각 중입니다...</p>
                  </div>
                )}
              </div>
            )}
            
            {view === 'history' && (
                <div className="history-log-view fade-in">
                    {historyLogData && historyLogData.length > 0 ? (
                        <ul className="history-log-list">
                            {historyLogData.map(({ noteId, title, groupId, groupName }) => (
                                <li key={noteId} className="history-log-item">
                                    <button onClick={() => handleLoadHistory(noteId, groupId)}>
                                        <span className="history-log-title">{title}</span>
                                        <span className="history-log-noteId">{noteId} (그룹: {groupName})</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="history-log-empty">
                            <p>채팅 로그가 없습니다.</p>
                            <p>Synapse와 대화를 시작하세요!</p>
                        </div>
                    )}
                </div>
            )}
    
            {view === 'keyword-selection' && (
                <div className="keyword-selection-view fade-in">
                    <p className="selection-guide">AI 추천(노란색)을 참고하여 요약에 포함할 핵심 단어를 선택하세요.</p>
                    <div className={`keyword-list ${isRegeneratingKeywords ? 'regenerating' : ''}`}>
                        {suggestedKeywords.map((keyword, index) => {
                            const isSelected = selectedKeywords.has(keyword);
                            const isRecommended = aiRecommendedKeywords.has(keyword);
                            
                            let chipClass = 'keyword-chip';
                            if (isRecommended) chipClass += ' ai-recommended';
                            if (isSelected) chipClass += ' selected';

                            return (
                                <button
                                key={index}
                                className={chipClass}
                                onClick={() => handleKeywordToggle(keyword)}
                                disabled={isRegeneratingKeywords}
                                >
                                {keyword}
                                </button>
                            );
                            })}
                        </div>
                        <div className="selection-actions">
                        <button
                            className="regenerate-keywords-button"
                            onClick={handleRegenerateKeywords}
                            disabled={isRegeneratingKeywords}
                            title="키워드 다시 추출"
                        >
                            <RefreshIcon />
                        </button>
                        <button
                            className="select-all-button"
                            onClick={handleSelectAllKeywords}
                            disabled={isRegeneratingKeywords}
                        >
                            {selectedKeywords.size === suggestedKeywords.length ? '전체 해제' : '전체 선택'}
                        </button>
                        <button
                            className="confirm-button"
                            onClick={handleConfirmKeywords}
                            disabled={selectedKeywords.size === 0 || isRegeneratingKeywords}
                        >
                            {selectedKeywords.size}개 선택 완료
                        </button>
                    </div>
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
                        <button key={lang.code} className="language-button" onClick={() => handleTranslate(lang.code)}>
                          {lang.name}
                        </button>
                      ))}
                  </div>
              </div>
            )}

            {view === 'result' && resultDataForApply && currentPreviewData && (
              <div className="result-only-view fade-in">
                    <div className="preview-pagination">
                        <button onClick={handlePrevPage} disabled={previewPage === 0}>{'< 이전'}</button>
                        <span>페이지 {previewPage + 1} / {currentPreviewData.totalPages}</span>
                        <button onClick={handleNextPage} disabled={previewPage >= currentPreviewData.totalPages - 1}>{'다음 >'}</button>
                    </div>
                    
                    <h4>{currentPreviewData.title}</h4>
                    <div className="result-markdown-preview"><ReactMarkdown>{currentPreviewData.content}</ReactMarkdown></div>
                    
                    <div className="result-apply-button-container">
                      {resultDataForApply.type === 'summary' && (
                        <button className="apply-to-note-button" onClick={handleApplyAndCreateNotes} disabled={isLoading}>
                            {isLoading ? '적용 중...' : '현재 노트에 적용 및 생성'}
                        </button>
                      )}
                      {resultDataForApply.type === 'translation' && (
                        <button className="apply-to-note-button" onClick={handleApplyTranslations} disabled={isLoading}>
                            {isLoading ? '적용 중...' : '새로운 번역 노트 생성'}
                        </button>
                      )}
                    </div>
              </div>
            )}
            
            {view === 'loading' && (
                <div className={`loading-view-full fade-in`}>
                    { (loadingType === 'summary' || loadingType === 'chat') && (
                        <div className="summary-loader">
                            <div className="loader-text">{loadingType === 'summary' ? 'AI 분석 중...' : '생각 중...'}</div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                        </div>
                    )}
                    { loadingType === 'title' && (
                        <div className="title-loader-wrapper">
                            <div className="loader-text">Synapse가 제목을 구상 중입니다...</div>
                            <div className="typing-effect">Thinking of a good title...</div>
                        </div>
                    )}
                    { loadingType === 'translate' && (
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

        {(isVisible && (view === 'initial' || view === 'chat')) && (
        <div className="chat-input-container-bottom">
            <button className="history-button" onClick={() => setView('history')} title="대화 기록 보기">
                <HistoryIcon />
            </button>
            <textarea
                className="chat-input"
                placeholder="Synapse에게 노트에 대해 물어보세요 (Enter)"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatSubmit}
                rows={1}
                disabled={!currentNoteContent || isLoading}
                onClick={() => {
                  setWasChatCleared(false);
                  setView('chat');
                }}
            />
        </div>
        )}
      </div>
    </div>
  );
}