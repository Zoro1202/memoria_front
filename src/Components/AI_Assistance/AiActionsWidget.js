import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNotes } from '../../Contexts/NotesContext';
import { TabsProvider, useTabs } from '../../Contexts/TabsContext';
import { useGroups } from '../../Contexts/GroupContext';
import { toast } from 'react-hot-toast';
import { HelpCircle, Copy } from 'lucide-react';
import memoriaIcon from './Black_Synapsehome.png';
import './AiActionsWidget.css';
import {
    loadChatHistory,
    deleteChatSession,
    loadAllChatSessions,
    suggestKeywords,
    generateSummaryWithKeywords,
    analyzeKeywordInContext,
    translateText,
    chatWithAI,
    generateTitleFromContent,
    generateContextualSummary, // [신규] generateContextualSummary 임포트
} from '../Note/note_AIassist';
import { createEditor, Editor, Text, Range, Path, Transforms, Node } from 'slate';
import { withReact, Slate, Editable, useSlate, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { Decorations } from '../Note/Util/Decorations';


const deserialize = (markdown) => {
    if (typeof markdown !== 'string') return [{ type: 'paragraph', children: [{ text: '' }] }];
    
    const lines = markdown.split('\n');
    const nodes = [];
    let listBuffer = null;

    const flushListBuffer = () => { if (listBuffer) {nodes.push(listBuffer);listBuffer = null;} };

    for (const line of lines) {
        if (line.startsWith('# ')) {
            flushListBuffer();
            nodes.push({ type: 'heading-one', children: [{ text: line.substring(2) || '' }] });
        } else if (line.startsWith('## ')) {
            flushListBuffer();
            nodes.push({ type: 'heading-two', children: [{ text: line.substring(3) || '' }] });
        } else if (line.startsWith('### ')) {
            flushListBuffer();
            nodes.push({ type: 'heading-three', children: [{ text: line.substring(4) || '' }] });
        } else if (line.startsWith('> ')) {
            flushListBuffer();
            nodes.push({ type: 'block-quote', children: [{ text: line.substring(2) || '' }] });
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            const listItem = { type: 'list-item', children: [{ text: line.substring(2) || '' }] };
            if (!listBuffer) {
                listBuffer = { type: 'bulleted-list', children: [] };
            }
            listBuffer.children.push(listItem);
        } else if (line.trim() === '---' || line.trim() === '___') {
            flushListBuffer();
            nodes.push({ type: 'divider', children: [{ text: '' }] });
        } else {
            flushListBuffer();
            nodes.push({ type: 'paragraph', children: [{ text: line || '' }] });
        }
    }

    flushListBuffer();

    const sanitized = nodes.map(node => {
        const newNode = Object.assign({}, node);
        if (!Array.isArray(newNode.children) || newNode.children.length === 0) {
            newNode.children = [{ text: '' }];
        }
        return newNode;
    });

    return sanitized.length > 0 ? sanitized : [{ type: 'paragraph', children: [{ text: '' }] }];
};

const SlatePreview = ({ content, notes, openTab, createNoteFromTitle }) => {
    const editor = useMemo(() => withHistory(withReact(createEditor())), []);
    const decorate = useMemo(() => Decorations(), []);
    const initialValue = useMemo(() => deserialize(content), [content]);

    const LeafComponent = useCallback(({ attributes, children, leaf }) => {
        let styledChildren = children;

        if (leaf.bold) {
            styledChildren = <strong>{styledChildren}</strong>;
        }
        if (leaf.italic) {
            styledChildren = <em>{styledChildren}</em>;
        }
        if (leaf.strikethrough) {
            styledChildren = <del>{styledChildren}</del>;
        }
        if (leaf.code) {
            styledChildren = <code>{styledChildren}</code>;
        }
        if (leaf.highlight) {
            styledChildren = <mark>{styledChildren}</mark>;
        }

        if (leaf.linkSyntax) {
            // 미리보기에서는 링크 구문을 항상 숨깁니다.
            return <span {...attributes} style={{ opacity: 0, fontSize: '0.1px', userSelect: 'none' }}>{children}</span>;
        }

        if (leaf.obsidianLink) {
            return (
                <a {...attributes} href="#" onClick={()=>{console.log('click!', leaf.linkValue)}} style={{color: '#1e90ff', backgroundColor: '#e6f0ff', padding: '2px 4px', borderRadius: '3px', cursor: 'default'}}>
                    {styledChildren}
                </a>
            );
        }

        return <span {...attributes}>{styledChildren}</span>;
    }, [notes, openTab, createNoteFromTitle]);

    const renderLeaf = useCallback(props => <LeafComponent {...props} />, [LeafComponent]);

    const renderElement = useCallback(({ attributes, children, element }) => {
        switch (element.type) {
            case 'heading-one': return <h1 {...attributes}>{children}</h1>;
            case 'heading-two': return <h2 {...attributes}>{children}</h2>;
            case 'heading-three': return <h3 {...attributes}>{children}</h3>;
            case 'block-quote': return <blockquote {...attributes}>{children}</blockquote>;
            case 'bulleted-list': return <ul {...attributes}>{children}</ul>;
            case 'list-item': return <li {...attributes}>{children}</li>;
            case 'divider': return <hr {...attributes} />;
            default: return <p {...attributes}>{children}</p>;
        }
    }, []);

    useEffect(() => {
        const newNodes = deserialize(content);
        if (JSON.stringify(editor.children) !== JSON.stringify(newNodes)) {
            Transforms.delete(editor, {
                at: { anchor: Editor.start(editor, []), focus: Editor.end(editor, []) },
            });
            Transforms.insertNodes(editor, newNodes, { at: [0] });
        }
    }, [content, editor]);

    return (
        <Slate editor={editor} initialValue={initialValue}>
            <Editable
                readOnly
                decorate={decorate}
                renderLeaf={renderLeaf}
                renderElement={renderElement}
            />
        </Slate>
    );
};

// 아이콘 컴포넌트
const ActionIcon = ({ path }) => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path}></path></svg> );
const MinimizeIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path></svg> );
const RefreshIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> );
const HistoryIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>);
const AnimatedTrashIcon = () => (
  <svg width="16" height="16" viewBox="0 -4 24 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <g className="trash-base">
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
    </g>
    <g className="trash-lid">
      <path d="M3 6h18"></path>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </g>
  </svg>
);

// MODIFICATION: 위젯 내 확인 대화상자 컴포넌트
const ConfirmationView = ({ message, onConfirm, onCancel, onUndo, confirmText = '확인', cancelText = '취소' }) => (
    <div className="confirmation-overlay" onClick={onUndo}> {/* 바깥 클릭은 onUndo */}
        <div className="confirmation-box" onClick={(e) => e.stopPropagation()}>
            <p className="confirmation-message">{message}</p>
            <div className="confirmation-actions">
                <button onClick={onCancel} className="confirmation-button cancel">{cancelText}</button> {/* 왼쪽 버튼은 onCancel */}
                <button onClick={onConfirm} className="confirmation-button confirm">{confirmText}</button> {/* 오른쪽 버튼은 onConfirm */}
            </div>
        </div>
    </div>
);



const ThreeOptionConfirmationView = ({ message, onConfirm, onNeutral, onCancel, confirmText, neutralText }) => (
    <div className="confirmation-overlay" onClick={onCancel}>
      <div className="confirmation-box" onClick={(e) => e.stopPropagation()}>
        <p className="confirmation-message">{message}</p>
        <div className="confirmation-actions">
          <button onClick={onNeutral} className="confirmation-button neutral">{neutralText}</button>
          <button onClick={onConfirm} className="confirmation-button confirm">{confirmText}</button>
        </div>
      </div>
    </div>
);


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

const HEADERS = {
    'Korean': { view_original: "원본 회의록", preview: "미리보기" },
    'English': { view_original: "Original Meeting Minutes", preview: "Preview" },
    'Japanese': { view_original: "元の議事録", preview: "プレビュー" },
    'Chinese': { view_original: "原始会议记录", preview: "预览" }
};


//채팅 기록 볼러오기(local)
const loadChatHistoriesFromStorage = () => {
    try {
        const histories = localStorage.getItem('chatHistories');
        return histories ? JSON.parse(histories) : {};
    } catch (error) {
        console.error("채팅 기록 불러오기 실패:", error);
        return {};
    }
};
// 채팅 기록 저장(local)
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
  const { notes, setNotes, setLinks, upsertNote, links, createOrAppendKeywordNote, loading: notesLoading, loadNotes, getNoteContent, createNoteFromTitle } = useNotes();
  const { tabs, activeTabId, noteIdFromTab, openTab, updateTitle, closeAllNoteTab } = useTabs();
  const { selectedGroupId, setSelectedGroupId, groups, user } = useGroups();
  
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
  const [isRegeneratingTitles, setIsRegeneratingTitles] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('Korean'); // 언어 상태 추가
  const [forceChatViewForNote, setForceChatViewForNote] = useState(null);
  const [customKeyword, setCustomKeyword] = useState('');

  const h = HEADERS[detectedLanguage] || HEADERS['Korean'];

  const [loadingMessage, setLoadingMessage] = useState('');

  const handleAddCustomKeyword = () => {
    const newKeyword = customKeyword.trim();
    if (!newKeyword) {
        toast.error("추가할 키워드를 입력해주세요.");
        return;
    }
    if (suggestedKeywords.includes(newKeyword)) {
        toast.error("이미 목록에 있는 키워드입니다.");
        return;
    }

    // 새 키워드를 추천 목록과 선택된 목록에 모두 추가
    setSuggestedKeywords(prev => [newKeyword, ...prev]);
    setSelectedKeywords(prev => new Set(prev).add(newKeyword));
    setCustomKeyword(''); // 입력 필드 초기화
    toast.success(`'${newKeyword}' 키워드가 추가되었습니다.`);
  };
  const [focusTrigger, setFocusTrigger] = useState(0);

//   const [chatHistoriesFromServer, setChatHistoriesFromServer] = useState([]);
//   const [isHistoryLoading, setIsHistoryLoading] = useState(false);


  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatHistoriesFromServer, setChatHistoriesFromServer] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);



  // MODIFICATION: window.confirm을 대체할 상태
  const [confirmation, setConfirmation] = useState(null);

  const abortControllerRef = useRef(null);
  const currentLoadingToastId = useRef(null); 
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  const currentNoteId = useMemo(() => {const currenttab = tabs.find(t => t.id === activeTabId);
    return currenttab ? currenttab.title : null;
  }, [activeTabId, noteIdFromTab]);

  const currentNote = useMemo(() => {
    if (!notes || !currentNoteId) return null;
    
    // First, try to find by note_id (for existing notes loaded from DB)
    const foundNote = Object.values(notes).find(note => String(note.note_id) === String(currentNoteId));
    if (foundNote) {
      return foundNote;
    }

    // Fallback to finding by key (for new notes where title is the id)
    return notes[currentNoteId] || null;
  }, [notes, currentNoteId]); // FIXME : 노트 실시간 업데이트가 안돼서 요약하면 이전 노트 내용으로 요약됨


  const existingNoteTitles = useMemo(() => {
    if (!notes) return new Set();
    return new Set(Object.keys(notes));
  }, [notes]);




  useEffect(() => {
        if (view === 'history' && user?.subject_id) {
            const fetchHistories = async () => {
                setIsHistoryLoading(true);
                try {
                    // [변경] note_AIassist.js에 새로 만든 함수 호출
                    const histories = await loadAllChatSessions(user.subject_id);
                    setChatHistoriesFromServer(histories);
                } catch (error) {
                    toast.error(`채팅 기록을 불러오는 데 실패했습니다: ${error.message}`);
                } finally {
                    setIsHistoryLoading(false);
                }
            };
            fetchHistories();
        }
    }, [view, user?.subject_id]);

    useEffect(() => {
        if (currentNote && selectedGroupId && user && user.subject_id) {
            setCurrentNoteContent(currentNote.content);
            
            const fetchHistory = async () => {
                try {
                    const { messages, session_id } = await loadChatHistory(currentNote.note_id, selectedGroupId, user.subject_id);
                    
                    const formattedMessages = messages.map(msg => ({
                        type: msg.sender_type,
                        text: msg.message_text,
                        timestamp: msg.timestamp
                    }));
                    setChatHistory(formattedMessages);
                    setCurrentSessionId(session_id);

                } catch (error) {
                    toast.error("이전 대화 내용을 불러오는 데 실패했습니다.");
                    setChatHistory([]);
                    setCurrentSessionId(null);
                }
            };
            fetchHistory();
        } else if (!notesLoading) {
            setCurrentNoteContent('');
            setChatHistory([]);
            setCurrentSessionId(null);
        }
    }, [currentNoteId, selectedGroupId, user]);

    useEffect(() => {
        if (forceChatViewForNote && forceChatViewForNote === currentNoteId) {
            setView('chat');
            setForceChatViewForNote(null);
        }
    }, [forceChatViewForNote, currentNoteId]);

    useEffect(() => {
        if (focusTrigger > 0 && chatInputRef.current) {
            chatInputRef.current.focus();
        }
    }, [focusTrigger]);

    useEffect(() => {
        if (chatContainerRef.current) {
            if (view === 'chat' || view === 'history') {
                setTimeout(() => {
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                }, 0);
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
    setWasChatCleared(false);
    setView('initial');
  };

  const handleMinimizeClick = () => onMinimize();

  const handleCloseClick = () => {
    handleGoBack();
    onClose();
  };

  const handleCopy = (textToCopy) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success('AI 답변이 복사되었습니다.', {
        duration: 1500,
        position: 'bottom-center',
      });
    }, () => {
      toast.error('복사에 실패했습니다.');
    });
  };

  const handleChatSubmit = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() !== '' && !isLoading) {
        e.preventDefault();
        const question = chatInput.trim();
        setChatInput('');
        if (chatInputRef.current) {
            chatInputRef.current.style.height = 'auto';
        }
        setView('chat');

        const newHistoryWithUser = [...chatHistory, { type: 'user', text: question, timestamp: new Date().toISOString() }];
        setChatHistory(newHistoryWithUser);
        
        setIsLoading(true);
        setLoadingType('chat');
        currentLoadingToastId.current = toast.loading('Synapse가 생각 중입니다...');
        abortControllerRef.current = new AbortController();

        try {
            // currentNote가 없으면 실행 불가
            if (!currentNote || !user?.subject_id || !selectedGroupId) {
                throw new Error("채팅에 필요한 정보가 부족합니다.");
            }

            const result = await chatWithAI(
                question,
                currentNoteContent,
                currentNote.note_id,
                selectedGroupId,
                user.subject_id,
                abortControllerRef.current.signal
            );
            
            setChatHistory(prev => [...prev, { type: 'ai', text: result.answer, timestamp: new Date().toISOString() }]);
            setCurrentSessionId(result.session_id);

            toast.success('답변 생성 완료!', { id: currentLoadingToastId.current });
        } catch (error) {
            if (error.name !== 'AbortError') toast.error(`AI 작업 실패: ${error.message}`, { id: currentLoadingToastId.current });
            setChatHistory(prev => prev.slice(0, -1)); // 실패 시 사용자 질문 제거
        } finally {
            setIsLoading(false);
            setLoadingType(null);
            abortControllerRef.current = null;
            setFocusTrigger(prev => prev + 1); // 포커스 트리거
        }
    }
  }

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
    if (chatInputRef.current) {
        const textarea = chatInputRef.current;
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${scrollHeight}px`;
    }
  };

  const handleClearChat = async () => {
        if (!currentSessionId) {
            toast.error("삭제할 채팅 세션이 없습니다.");
            return;
        }
        if (!user?.subject_id) { // 사용자 ID 확인
            toast.error("사용자 정보가 없어 삭제할 수 없습니다.");
            return;
        }

        const toastId = toast.loading('대화 기록 삭제 중...');
        try {
            // [변경] 백엔드에 세션 삭제 요청 (subject_id와 함께)
            await deleteChatSession(currentSessionId, user.subject_id);

            setChatHistory([]);
            setChatInput('');
            setCurrentSessionId(null); // 세션 ID 초기화
            setView('initial');
            setWasChatCleared(true);
            toast.success('대화 내용이 초기화되었습니다.', { id: toastId });
        } catch(error) {
            toast.error(`삭제 실패: ${error.message}`, { id: toastId });
        }
    };


    const handleLoadHistory = async (noteToLoadId, noteTitle, groupId) => {
    setForceChatViewForNote(noteToLoadId);
    if (String(groupId) === String(selectedGroupId)) {
        openTab({ title: noteTitle, type: 'note', noteId: noteToLoadId });
    } else {
        closeAllNoteTab();
        const groupName = groupNameMap[groupId] || `ID: ${groupId}`;
        toast(`'${groupName}' 그룹으로 이동합니다...`, { icon: '➡️' });

        setSelectedGroupId(groupId);
        await loadNotes(groupId); // Ensure notes are loaded for the new group
        openTab({ title: noteTitle, type: 'note', noteId: noteToLoadId }); // Open tab after notes are loaded
    }

    // Explicitly load the content of the selected historical note
    try {
      const noteData = await getNoteContent(noteToLoadId, groupId);
      if (noteData && typeof noteData.content === 'string') {
        setCurrentNoteContent(noteData.content); // 직접 상태 업데이트
      }
    } catch (error) {
      toast.error(`노트 내용을 불러오는 데 실패했습니다: ${error.message}`);
    }

    // Explicitly load chat history for the selected note
    if (user && user.subject_id) {
        try {
            const { messages, session_id } = await loadChatHistory(noteToLoadId, groupId, user.subject_id);
            const formattedMessages = messages.map(msg => ({
                type: msg.sender_type,
                text: msg.message_text,
                timestamp: msg.timestamp
            }));
            setChatHistory(formattedMessages);
            setCurrentSessionId(session_id);
        } catch (error) {
            toast.error("대화 내용을 불러오는 데 실패했습니다.");
            setChatHistory([]);
            setCurrentSessionId(null);
        }
    }

    setView('chat');
  };

  const handleDeleteHistory = async (e, sessionIdToDelete) => {
        e.stopPropagation();
        if (!sessionIdToDelete) return;
        if (!user?.subject_id) { // 사용자 ID 확인
            toast.error("사용자 정보가 없어 삭제할 수 없습니다.");
            return;
        }

        const toastId = toast.loading('기록 삭제 중...');
        try {
            // [변경] 백엔드에 세션 삭제 요청 (subject_id와 함께)
            await deleteChatSession(sessionIdToDelete, user.subject_id);
            
            // UI에서 즉시 반영
            setChatHistoriesFromServer(prev => prev.filter(h => h.session_id !== sessionIdToDelete));

            // 만약 현재 열린 채팅이 삭제된 세션이라면, 현재 채팅창도 초기화
            if (currentSessionId === sessionIdToDelete) {
                setChatHistory([]);
                setCurrentSessionId(null);
            }

            toast.success('채팅 기록이 삭제되었습니다.', { id: toastId });
        } catch (error) {
            console.error("채팅 기록 삭제 실패:", error);
            toast.error(`기록 삭제 중 오류: ${error.message}`, { id: toastId });
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
        if (view !== 'history' || !chatHistoriesFromServer) return [];
        return chatHistoriesFromServer.map(session => ({ 
            ...session, // session_id, note_id, group_id 등 모든 정보 포함
            displayTitle: session.note_title || `노트 ID: ${session.note_id}`,
            displayGroupName: session.group_name || `그룹 ID: ${session.group_id}`,
            note_title: session.note_title // Explicitly include note_title
        }));
    }, [view, chatHistoriesFromServer]);

  const [isContextualSummary, setIsContextualSummary] = useState(false);
  const [referenceNotes, setReferenceNotes] = useState([]);

  const handleStartSummaryProcess = async () => {
    if (!currentNoteContent) {
        toast.error("요약할 노트 내용이 없습니다.");
        return;
    }

    // [신규] 맥락 요약 여부 질문
    setConfirmation({
        message: "다른 노트를 참조하여 더 깊이 있는 요약을 생성할까요?",
        confirmText: "다른 노트 참조",
        neutralText: "일반 요약",
        onConfirm: () => {
            setIsContextualSummary(true);
            setConfirmation(null);
            setView('note-selection'); // 노트 선택 뷰로 전환
        },
        onNeutral: () => {
            setIsContextualSummary(false);
            setConfirmation(null);
            proceedToKeywordExtraction(); // 기존 요약 프로세스 진행
        },
        onCancel: () => {
            setConfirmation(null);
        }
    });
  };

  const proceedToKeywordExtraction = async () => {
    setView('loading');
    setLoadingType('summary');
    const msg = 'Synapse가 키워드를 추천 중입니다...';
    setLoadingMessage(msg);
    
    currentLoadingToastId.current = toast.loading(msg);  

    abortControllerRef.current = new AbortController();
    try {
        const textForKeywords = isContextualSummary 
            ? [currentNoteContent, ...referenceNotes.map(n => n.content)].join('\n\n---\n\n')
            : currentNoteContent;

        const data = await suggestKeywords(textForKeywords, abortControllerRef.current.signal);
        setSuggestedKeywords(data.all_keywords || []);
        const recommended = new Set(data.recommended_keywords || []);
        setAiRecommendedKeywords(recommended);
        setSelectedKeywords(recommended);
        setDetectedLanguage(data.detectedLanguage || 'Korean');
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
      const toastId = toast.loading('Synapse가 키워드를 다시 추천 중입니다...');
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

  const handleRegenerateTitles = async () => {
      if (!currentNoteContent || isRegeneratingTitles) return;

      setIsRegeneratingTitles(true);
      const toastId = toast.loading('Synapse가 제목을 다시 구상 중입니다...');
      abortControllerRef.current = new AbortController();

      try {
          const titles = await generateTitleFromContent(currentNoteContent, abortControllerRef.current.signal);
          setSuggestedTitles(titles);
          toast.success('새로운 제목을 추천했습니다!', { id: toastId });
      } catch (error) {
          if (error.name !== 'AbortError') {
              toast.error(`AI 제목 생성 실패: ${error.message}`, { id: toastId });
          } else {
              toast.dismiss(toastId);
          }
      } finally {
          setIsRegeneratingTitles(false);
          abortControllerRef.current = null;
      }
  };

  // MODIFICATION: window.confirm을 ConfirmationView로 대체
  const handleKeywordToggle = (keyword) => {
    const isExisting = existingNoteTitles.has(keyword);
    const isAdding = !selectedKeywords.has(keyword);

    const performToggle = () => {
        setSelectedKeywords(prev => {
            const newSet = new Set(prev);
            newSet.has(keyword) ? newSet.delete(keyword) : newSet.add(keyword);
            return newSet;
        });
    };

    if (isAdding && isExisting) {
        setConfirmation({
            message: `'${keyword}' 노트는 이미 존재합니다. 선택 시 기존 노트의 내용 하단에 AI 분석 결과가 추가될 수 있습니다. 계속하시겠습니까?`,
            onConfirm: () => {
                performToggle();
                setConfirmation(null);
            },
            onCancel: () => setConfirmation(null)
        });
    } else {
        performToggle();
    }
  };

  const handleSelectAllKeywords = () => {
    if (selectedKeywords.size === suggestedKeywords.length) {
        setSelectedKeywords(new Set());
    } else {
        setSelectedKeywords(new Set(suggestedKeywords));
    }
  };
  
  const handleReferenceNoteToggle = (note) => {
    setReferenceNotes(prev => {
        const isSelected = prev.some(n => n.note_id === note.note_id);
        if (isSelected) {
            return prev.filter(n => n.note_id !== note.note_id);
        } else {
            if (prev.length < 2) {
                return [...prev, note];
            }
            toast.error('참조 노트는 최대 2개까지 선택할 수 있습니다.');
            return prev;
        }
    });
  };

  // MODIFICATION: 실제 요약 생성 로직을 별도 함수로 분리
  const proceedWithSummaryGeneration = async (shouldFillContent) => {
      setConfirmation(null);
      setView('loading');
      setLoadingType('summary');
      const msg = '요약문을 생성 중입니다...';
      setLoadingMessage(msg);
      
      currentLoadingToastId.current = toast.loading(msg); 
      
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
          const finalKeywords = Array.from(selectedKeywords);
          
          const summaryResult = isContextualSummary 
              ? await generateContextualSummary(
                    currentNoteContent, 
                    referenceNotes.map(n => n.content),
                    finalKeywords, 
                    detectedLanguage, 
                    signal,
                    referenceNotes.map(n => n.title) // 참조 노트 제목 전달
                )
              : await generateSummaryWithKeywords(currentNoteContent, finalKeywords, detectedLanguage, signal);

          const keywordDataMap = {};
          if (finalKeywords.length > 0 && shouldFillContent) {
              const sourceNoteTitle = notes[currentNoteId]?.title || currentNoteId;
              const textForKeywordAnalysis = isContextualSummary 
                  ? [currentNoteContent, ...referenceNotes.map(n => n.content)].join('\n\n---\n\n')
                  : currentNoteContent;
              const keywordContentPromises = finalKeywords.map(keyword =>
                  analyzeKeywordInContext(textForKeywordAnalysis, keyword, detectedLanguage, null, signal, sourceNoteTitle)
              );
              const keywordContents = await Promise.all(keywordContentPromises);
              
              finalKeywords.forEach((keyword, index) => {
                  keywordDataMap[keyword] = keywordContents[index];
              });
          } else {
              finalKeywords.forEach(keyword => {
                  keywordDataMap[keyword] = '';
              });
          }

          setResultDataForApply({
              type: 'summary',
              summaryContent: summaryResult.summary,
              keywordMap: keywordDataMap,
              textType: isContextualSummary ? 'meeting_transcript' : summaryResult.textType
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

  // MODIFICATION: 확인 로직을 ConfirmationView로 대체
  const handleConfirmKeywords = () => {
    if (selectedKeywords.size === 0) {
        setConfirmation({
            message: "선택된 키워드가 없습니다.\n키워드 노트 없이 요약문만 생성하시겠습니까?",
            confirmText: "확인",
            cancelText: "취소",
            onConfirm: () => proceedWithSummaryGeneration(false),
            onCancel: () => setConfirmation(null),
            onUndo: () => setConfirmation(null), // 이 경우 바깥 클릭도 취소
        });
    } else {
        setConfirmation({
            message: "생성되는 키워드 노드의 내용을 AI로 채우시겠습니까?",
            confirmText: " 노드 내용 채우기",
            cancelText: "빈 노드만 생성",
            onConfirm: () => proceedWithSummaryGeneration(true),
            onCancel: () => proceedWithSummaryGeneration(false), // "빈 노트로 진행"
            onUndo: () => setConfirmation(null), // "뒤로가기/Undo"
        });
    }
};

  const handleApplyAndCreateNotes = async () => {
    const oldNote = currentNote;

    if (!oldNote || !resultDataForApply || !selectedGroupId) {
        toast.error("적용할 노트, 데이터 또는 그룹을 찾을 수 없습니다.");
        return;
    }

    setIsLoading(true);
    currentLoadingToastId.current = toast.loading('현재 노트에 요약문을 적용 중입니다...'); 

    try {
        const { summaryContent, keywordMap, textType } = resultDataForApply;
        
        toast.success(`디버그: 적용된 요약 타입은 '${textType}' 입니다.`);

        const plainTextContent = (oldNote.content || '').replace(/<[^>]*>?/gm, '');

        // textType에 따라 레이블을 동적으로 결정
        const originalContentLabel = textType === 'plain_text_article' ? '원본 문서' : h.view_original;

        // Markdown 구분선과 제목으로 원본 회의록을 깔끔하게 추가
        const originalContentBlock = `\n\n---\n\n## ${originalContentLabel}\n\n${plainTextContent}`;
        
        const finalContent = `${summaryContent}${originalContentBlock}`;

        await upsertNote(selectedGroupId, oldNote.title, finalContent, oldNote.note_id, oldNote.title);
        toast.success(`"${oldNote.title}" 노트 업데이트 완료!`, { id: currentLoadingToastId.current });

        const keywords = Object.keys(keywordMap);
        if (keywords.length > 0) {
            const newNotesData = {};
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
                [oldNote.title]: { ...prevNotes[oldNote.title], content: finalContent },
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

        } else {
             setNotes(prevNotes => ({
                ...prevNotes,
                [oldNote.title]: { ...prevNotes[oldNote.title], content: finalContent },
            }));
            setLinks(prevLinks => prevLinks.filter(link => link.source !== oldNote.title));
        }

        onClose();

    } catch (error) {
        toast.error(`저장 중 오류 발생: ${error.message}`, { id: currentLoadingToastId.current });
    } finally {
        setIsLoading(false);
        currentLoadingToastId.current = null;
    }
  };


  const handleGenerateTitle = async () => {
    if (!currentNote) {
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
    const noteToUpdate = currentNote;
    const oldNoteKey = Object.keys(notes).find(key => notes[key].note_id === noteToUpdate?.note_id) || noteToUpdate?.title;

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
    
    currentLoadingToastId.current = toast.loading('노트를 번역하는 중...'); 

    try {
        if (!currentNote) {
            throw new Error("번역할 현재 노트를 찾을 수 없습니다.");
        }

        const translationResult = await translateText(currentNote.title, currentNoteContent, targetLanguage, signal);
        
        setResultDataForApply({
            type: 'translation',
            translations: [
              {
                originalTitle: currentNote.title,
                translatedTitle: translationResult.translated_title,
                translatedContent: translationResult.translated_content
              }
            ]
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
    if (!resultDataForApply || resultDataForApply.type !== 'translation') return;

    setConfirmation({
        message: "번역 결과를 어떻게 적용할까요?",
        confirmText: "새 노트로 생성",
        cancelText: "현재 노트에 덮어쓰기",
        onConfirm: () => applyTranslation(true), // 새 노트로 생성
        onCancel: () => applyTranslation(false), // 덮어쓰기
        onUndo: () => setConfirmation(null),
    });
  };

  const applyTranslation = async (createNew) => {
    setConfirmation(null);
    if (!resultDataForApply || resultDataForApply.type !== 'translation' || !selectedGroupId) {
        toast.error("적용할 번역 데이터가 없거나 그룹이 선택되지 않았습니다.");
        return;
    }

    setIsLoading(true);
    const translationItem = resultDataForApply.translations[0];
    const { originalTitle, translatedTitle, translatedContent } = translationItem;
    
    const toastId = toast.loading(createNew ? `'${translatedTitle}' 노트 생성 중...` : `'${originalTitle}' 노트 업데이트 중...`);

    try {
        const noteToUpdate = notes[originalTitle];
        const noteIdToUpsert = createNew ? null : noteToUpdate?.note_id;

        const { noteId: finalNoteId } = await upsertNote(
            selectedGroupId,
            createNew ? translatedTitle : originalTitle, // 덮어쓰기 시에는 원본 제목 유지
            translatedContent,
            noteIdToUpsert,
            createNew ? null : originalTitle
        );

        if (createNew) {
            setNotes(prev => ({ 
                ...prev, 
                [translatedTitle]: {
                    content: translatedContent,
                    note_id: finalNoteId,
                    title: translatedTitle
                }
            }));
            openTab({ title: translatedTitle, type: 'note', noteId: finalNoteId });
            toast.success('새로운 번역 노트 생성 완료!', { id: toastId });
        } else {
            setNotes(prev => {
                const newState = { ...prev };
                const oldNoteData = newState[originalTitle];
                if (oldNoteData) {
                    delete newState[originalTitle];
                    newState[translatedTitle] = {
                        ...oldNoteData,
                        content: translatedContent,
                        title: translatedTitle,
                        update_at: new Date().toISOString(),
                    };
                }
                return newState;
            });
            updateTitle(originalTitle, translatedTitle);
            toast.success(`'${originalTitle}' 노트가 업데이트되었습니다.`, { id: toastId });
        }
        
        onClose();

    } catch (error) {
        toast.error(`번역 적용 실패: ${error.message}`, { id: toastId });
    } finally {
        setIsLoading(false);
    }
  };

  const [isPageTurning, setIsPageTurning] = useState(false);

  const [pageTurnDirection, setPageTurnDirection] = useState('next');

  const handlePrevPage = () => {
    if (isPageTurning) return;
    setPageTurnDirection('prev');
    setIsPageTurning(true);
    setTimeout(() => {
        setPreviewPage(prev => Math.max(0, prev - 1));
        setIsPageTurning(false);
    }, 300); // 애니메이션 시간과 일치
  };

  const handleNextPage = () => {
    if (isPageTurning || !currentPreviewData) return;
    setPageTurnDirection('next');
    setIsPageTurning(true);
    setTimeout(() => {
        setPreviewPage(prev => Math.min(currentPreviewData.totalPages - 1, prev + 1));
        setIsPageTurning(false);
    }, 300); // 애니메이션 시간과 일치
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
            const content = resultDataForApply.keywordMap[keyword] || '*(빈 노트로 생성됩니다)*';
            return { title: `키워드: ${keyword}`, content, totalPages };
        }
    }

    if (resultDataForApply.type === 'translation') {
        const totalPages = 1; // Only one page for the current note translation
        const translationItem = resultDataForApply.translations[0];
        if (translationItem) {
            const title = `번역 미리보기: ${translationItem.translatedTitle}`;
            return { title: title, content: translationItem.translatedContent, totalPages };
        }
    }

    return null;
  }, [resultDataForApply, previewPage]);

  const isValidChatHistory = Array.isArray(chatHistory);

  return (
    <div className={`ai-actions-widget ${isVisible ? 'visible' : ''}`}>
      <div className="widget-header">
        {(view !== 'initial' || wasChatCleared) && (
          <button className="widget-back-button" onClick={handleGoBack}>←</button>
        )}
        <h4 className="widget-title">AI Assistant</h4>
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
            {/* ... (이전 뷰들은 동일) ... */}
            
            {view === 'initial' && (
              <div className={`initial-view-container ${wasChatCleared ? 'cleared-mode' : ''} fade-in`}>
                {wasChatCleared ? (
                  <div className="ai-greeting centered">
                      <div className="cleared-text-container">
                        <div className="cleared-text-line">대화가 초기화 되었습니다.</div>
                        <div className="cleared-text-line">다시 질문해주세요.</div>
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
                                <div className={`chat-message ${msg.type}`}>
                                    {msg.type === 'ai' ? <SlatePreview content={msg.text} notes={notes} openTab={openTab} createNoteFromTitle={createNoteFromTitle} /> : <p>{msg.text}</p>}
                                </div>
                                {msg.type === 'ai' && (
                                    <button className="chat-copy-button" onClick={() => handleCopy(msg.text)} title="답변 복사">
                                        <Copy size={14} />
                                    </button>
                                )}
                                <span className="chat-message-time">{formatTime(msg.timestamp)}</span>
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
                  <div className="chat-message ai thinking-message">
                    <p>Synapse가 생각 중입니다<span className="thinking-ellipsis"></span></p>
                  </div>
                )}
              </div>
            )}
            
            {view === 'history' && (
        <div className="history-log-view fade-in">
            {isHistoryLoading ? <p>로딩 중...</p> : (
            historyLogData && historyLogData.length > 0 ? (
                <ul className="history-log-list">
                    {historyLogData.map(({ session_id, note_id, group_id, displayTitle, displayGroupName, note_title }) => (
                        <li key={session_id} className="history-log-item">
                            <div
                                className="history-log-content"
                                onClick={() => handleLoadHistory(note_id, note_title, group_id)}
                            >
                                <span className="history-log-title">{displayTitle}</span>
                                <span className="history-log-noteId">그룹: {displayGroupName}</span>
                            </div>
                            <button
                                className="history-delete-button"
                                onClick={(e) => handleDeleteHistory(e, session_id)}
                                title="Synapse 채팅 기록 삭제"
                            >
                                <AnimatedTrashIcon />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="history-log-empty">
                    <p>채팅 로그가 없습니다.</p>
                    <p>Synapse와 대화를 시작하세요!</p>
                </div>
            ))}
        </div>
    )}
    
            {view === 'note-selection' && (
                <div className="note-selection-view fade-in">
                    <p className="selection-guide">참조할 노트를 최대 2개까지 선택하세요.</p>
                    <div className="note-list">
                        {Object.values(notes).filter(note => note.note_id !== currentNote.note_id).map(note => (
                            <div 
                                key={note.note_id}
                                className={`note-item ${referenceNotes.some(n => n.note_id === note.note_id) ? 'selected' : ''}`}
                                onClick={() => handleReferenceNoteToggle(note)}
                            >
                                {note.title}
                            </div>
                        ))}
                    </div>
                    <div className="selection-actions">
                        <button 
                            className="confirm-button"
                            onClick={proceedToKeywordExtraction}
                        >
                            {referenceNotes.length}개 노트 선택 완료
                        </button>
                    </div>
                </div>
            )}

            {view === 'keyword-selection' && (
                <div className="keyword-selection-view fade-in">
                    <p className="selection-guide">AI 추천(노란색) 및 기존 노트(*)를 참고하여 키워드를 선택하거나, 직접 추가하세요.</p>
                    
                    {/* 사용자 키워드 추가 UI */}
                    <div className="custom-keyword-input-container">
                        <input
                            type="text"
                            value={customKeyword}
                            onChange={(e) => setCustomKeyword(e.target.value)}
                            placeholder="추가할 키워드 입력..."
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomKeyword()}
                        />
                        <button onClick={handleAddCustomKeyword}>추가</button>
                    </div>

                    <div className={`keyword-list ${isRegeneratingKeywords ? 'regenerating' : ''}`}>
                        {suggestedKeywords.map((keyword, index) => {
                            const isSelected = selectedKeywords.has(keyword);
                            const isRecommended = aiRecommendedKeywords.has(keyword);
                            const isExisting = existingNoteTitles.has(keyword);
                            
                            let chipClass = 'keyword-chip';
                            if (isRecommended) chipClass += ' ai-recommended';
                            if (isSelected) chipClass += ' selected';
                            if (isExisting) chipClass += ' existing';

                            return (
                                <button
                                key={index}
                                className={chipClass}
                                onClick={() => handleKeywordToggle(keyword)}
                                disabled={isRegeneratingKeywords}
                                title={isExisting ? `"${keyword}" 노트가 이미 존재합니다. 선택 시 내용이 추가됩니다.` : ''}
                                >
                                {keyword}
                                {isExisting && <span className="existing-indicator">*</span>}
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
                            disabled={isRegeneratingKeywords}
                        >
                            {selectedKeywords.size}개 선택 완료
                        </button>
                    </div>
                </div>
            )}
            
            {view === 'title-suggestions' && (
                <div className="keyword-selection-view fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 8px' }}>
                        <p className="selection-guide" style={{ margin: 0, textAlign: 'left', flexGrow: 1 }}>Synapse가 추천하는 제목입니다.</p>
                        <button
                            className="regenerate-keywords-button"
                            onClick={handleRegenerateTitles}
                            disabled={isRegeneratingTitles}
                            title="제목 다시 생성"
                            style={{ marginRight: 0 }}
                        >
                            <RefreshIcon />
                        </button>
                    </div>
                    <div className="action-button-group vertical" style={{ width: '100%', padding: '0', gap: '10px', display: 'flex', flexDirection: 'column' }}>
                        {suggestedTitles.map((title, index) => (
                          <button key={index} className="action-button" onClick={() => handleSelectTitle(title)} style={{width: '100%'}}>
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
              <div className={`result-only-view fade-in`}>
                    <div className="preview-pagination">
                        <button onClick={handlePrevPage} disabled={previewPage === 0 || isPageTurning} title="이전 페이지">‹</button>
                        <span>페이지 {previewPage + 1} / {currentPreviewData.totalPages}</span>
                        <button onClick={handleNextPage} disabled={previewPage >= currentPreviewData.totalPages - 1 || isPageTurning} title="다음 페이지">›</button>
                    </div>
                    
                    <div 
                        key={previewPage} 
                        className={`result-markdown-preview ${isPageTurning ? `page-turn-out-${pageTurnDirection}` : `page-turn-in-${pageTurnDirection}`}`}>
                        <h4>{currentPreviewData.title}</h4>
                        <SlatePreview content={currentPreviewData.content} notes={notes} openTab={openTab} createNoteFromTitle={createNoteFromTitle} />
                        {resultDataForApply.type === 'summary' && previewPage === 0 && (
                            <details className="original-content-collapser">
                                <summary>{resultDataForApply.textType === 'plain_text_article' ? '원본 문서' : h.view_original} ({h.preview}: {(currentNoteContent || '').trim().split('\n')[0].substring(0, 50)}...)</summary>
                                <div className="original-content-body">
                                    <SlatePreview content={currentNoteContent} notes={notes} openTab={openTab} createNoteFromTitle={createNoteFromTitle} />
                                </div>
                            </details>
                        )}
                    </div>
                    
                    <div className="result-actions">
                      <button className="confirmation-button cancel" onClick={handleGoBack}>취소</button>
                      {resultDataForApply.type === 'summary' && (
                        <button className="confirmation-button confirm" onClick={handleApplyAndCreateNotes} disabled={isLoading}>
                            {isLoading ? '적용 중...' : '적용 및 생성'}
                        </button>
                      )}
                      {resultDataForApply.type === 'translation' && (
                        <button className="confirmation-button confirm" onClick={handleApplyTranslations} disabled={isLoading}>
                            {isLoading ? '적용 중...' : '번역 노트 생성'}
                        </button>
                      )}
                    </div>
              </div>
            )}
            
            {view === 'loading' && (
                <div className={`loading-view-full fade-in`}>
                    { (loadingType === 'summary' || loadingType === 'chat') && (
                        <div className="summary-loader">
                            <div className="loader-text">{loadingMessage}</div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                        </div>
                    )}
                    { loadingType === 'title' && (
                        <div className="title-loader">
                            <div className="loader-text">Synapse가 제목을 구상 중입니다...</div>
                            <svg className="synapse-svg-loader" viewBox="0 0 100 100">
                                {/* Neurons (dots) */}
                                <circle className="neuron-dot" cx="50" cy="10" r="4" />
                                <circle className="neuron-dot" cx="85" cy="35" r="4" />
                                <circle className="neuron-dot" cx="85" cy="65" r="4" />
                                <circle className="neuron-dot" cx="50" cy="90" r="4" />
                                <circle className="neuron-dot" cx="15" cy="65" r="4" />
                                <circle className="neuron-dot" cx="15" cy="35" r="4" />

                                {/* Synapses (lines) */}
                                <line className="synapse-line" x1="50" y1="10" x2="85" y2="35" />
                                <line className="synapse-line" x1="85" y1="35" x2="85" y2="65" />
                                <line className="synapse-line" x1="85" y1="65" x2="50" y2="90" />
                                <line className="synapse-line" x1="50" y1="90" x2="15" y2="65" />
                                <line className="synapse-line" x1="15" y1="65" x2="15" y2="35" />
                                <line className="synapse-line" x1="15" y1="35" x2="50" y2="10" />
                            </svg>
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
            <div className="chat-input-wrapper">
                <textarea
                    ref={chatInputRef}
                    className="chat-input"
                    placeholder="Synapse에게 노트에 대해 물어보세요 (Enter)"
                    value={chatInput}
                    onChange={handleChatInputChange}
                    onKeyDown={handleChatSubmit}
                    rows={1}
                    disabled={!currentNoteContent || isLoading}
                    onClick={() => {
                      setWasChatCleared(false);
                      setView('chat');
                    }}
                />
            </div>
        </div>
        )}
      </div>

      {confirmation && (
        confirmation.neutralText ? 
        <ThreeOptionConfirmationView {...confirmation} /> : 
        <ConfirmationView {...confirmation} />
      )}

      </div>
  );
}