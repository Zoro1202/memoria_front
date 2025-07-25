import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { toast } from 'react-hot-toast';
import { getResourceAPI } from './APIs/ResourceAPI';
import io from 'socket.io-client';
import ShareDBClient from 'sharedb-client';

const NotesContext = createContext();

export function useNotes() {
  return useContext(NotesContext);
}

export function NotesProvider({ children }) {
  // region 백엔드 REST API
  const resourceAPI = getResourceAPI();

// region -------------------------------------------------------------------------------


  // region note 관련 state
  const [notes, setNotes] = useState({});
  const [activeNoteContent, setActiveNoteContent] = useState('');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  
  // region Socket.IO 및 ShareDB 관련
  const socketRef = useRef(null);
  const connectionRef = useRef(null);
  const docRef = useRef(null);

  // region Socket Connect
  const connectSocket = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('소켓은 이미 연결되어 있습니다!');
      return;
    }

    socketRef.current = io('https://login.memoriatest.kro.kr', {
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      withCredentials: true
    });

    const stream = {
      write: (msg) => {
        if (socketRef.current) socketRef.current.emit('sharedb', JSON.stringify(msg));
      },
      on: (event, handler) => {
        if (!socketRef.current) return;
        if (event === 'data') socketRef.current.on('sharedb', (data) => handler(JSON.parse(data)));
        if (event === 'close') socketRef.current.on('disconnect', handler);
      }
    };
    connectionRef.current = new ShareDBClient.Connection(stream);
    registerSocketListeners();
    socketRef.current.on('connect', () => console.log('Socket 연결됨'));
    socketRef.current.on('disconnect', (reason) => console.log('Socket 연결 해제:', reason));
  }, []);
  // region Socket Listen
  const registerSocketListeners = useCallback(() => {
    if (!socketRef.current || !connectionRef.current) {
      console.error('ShareDB connection이 아직 생성되지 않음!');
      return;
    }

    socketRef.current.on('note_loaded', (data) => {
      if (!data || data.noteId === undefined) {
        console.error('note_loaded ERROR : data 반환 오류');
        return;
      }
      docRef.current = connectionRef.current.get('notes', data.noteId);
      docRef.current.subscribe(function (err) {
        if (err) throw err;
        setNotes(prev => ({
          ...prev,
          [data.title || 'Untitled']: {
            content: docRef.current.data.content,
            note_id: data.noteId,
            title: docRef.current.data.title
          }
        }));
        setActiveNoteContent(docRef.current.data.content);
        setCurrentNoteId(data.noteId);
      });
      docRef.current.on('op', function (op, source) {
        if (!source) {
          const noteTitle = docRef.current.data.title || 'Untitled';
          setNotes(prev => ({
            ...prev,
            [noteTitle]: {
              ...prev[noteTitle],
              content: docRef.current.data.content,
              title: docRef.current.data.title
            }
          }));
          setActiveNoteContent(docRef.current.data.content);
        }
      });
      console.log('노트 로드됨:', data.title);
    });

    socketRef.current.on('note_updated', (data) => {
      console.log('노트 업데이트 수신:', data);
      const noteTitle = data.title || 'Untitled';
      setNotes(prev => ({
        ...prev,
        [noteTitle]: {
          ...prev[noteTitle],
          content: data.content,
          title: data.title,
          note_id: data.noteId
        }
      }));
      if (data.noteId === currentNoteId) {
        setActiveNoteContent(data.content);
      }
    });

    socketRef.current.on('edit_error', (err) => {
      console.error('노트 편집 에러:', err);
      toast.error(`노트 편집 실패: ${err.message}`);
    });

    socketRef.current.on('join_error', (err) => {
      toast.error(err.message || '노트 입장에 실패했습니다.');
      if (socketRef.current) socketRef.current.disconnect();
    });

  }, [currentNoteId]);
  // region Socket Disconnect
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      connectionRef.current = null;
      docRef.current = null;
      setCurrentNoteId(null);
      console.log('소켓 연결 해제됨');
    }
  }, []);
// region -------------------------------------------------------------------------------
  // region 노트/링크 로드
  const loadNotes = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoading(true); 
    try {
      const response = await resourceAPI.getGroupNotes(groupId);
      if (response && response.titles) {
        const notesObject = {};
        const noteIdToTitleMap = {};
        const getNoteContentForLoad = async (note_id, group_id) => {
            try {
                const response = await resourceAPI.getNoteContent(note_id, group_id);
                return response && typeof response.content === 'string' ? response.content : '';
            } catch (err) {
                console.error(`노트 내용 조회 실패 (note_id: ${note_id}):`, err);
                return '';
            }
        };

        const contentPromises = response.titles.map(note => 
          getNoteContentForLoad(note.note_id, groupId).then(content => ({ note, content }))
        );
        const noteContents = await Promise.all(contentPromises);
        
        noteContents.forEach(({ note, content }) => {
          notesObject[note.title] = { content: content || '', note_id: note.note_id, title: note.title };
          noteIdToTitleMap[note.note_id] = note.title;
        });
        
        setNotes(notesObject);
        setCurrentGroupId(groupId);
        
        if (response.links) {
          const linksFormatted = response.links.map(link => {
            const sourceTitle = noteIdToTitleMap[link.src_note_id];
            const targetTitle = link.dst_title;
            return sourceTitle && targetTitle ? { source: sourceTitle, target: targetTitle } : null;
          }).filter(Boolean);
          setLinks(linksFormatted);
        } else {
          setLinks([]);
        }
        
        toast.success(`노트 ${response.titles.length}개 로드됨`);
        return response;
      } else {
        setNotes([]);
        setLinks([]);
      }
    } catch (err) {
      console.error('노트 로드 실패:', err);
      toast.error('노트 목록을 불러올 수 없습니다.');
      setNotes([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [resourceAPI]);

  // region upsert note
  const upsertNote = useCallback(async (group_id, title, content, note_id = null, oldTitle = null) => {
    const noteIdToUpsert = (note_id === -2 || !note_id ) ? -2 : note_id;
    try {
      const response = await resourceAPI.upsertNote(group_id, title, content, noteIdToUpsert, oldTitle); 

      if (response && response.success) {
        const isTitleChanged = oldTitle && oldTitle !== title;

        if (isTitleChanged) {
          // ✨ 제목이 변경된 경우, 다른 노트들의 내용도 바뀌었을 수 있으므로
          //    전체 데이터를 새로고침하여 완벽하게 동기화합니다.
          toast.success('제목 및 관련 링크가 모두 업데이트되었습니다!');
          await loadNotes(group_id); 
        } else {
          // 제목 변경이 없는 일반적인 저장
          const isNewNote = (noteIdToUpsert === -2);
          const finalNoteId = isNewNote ? response.insertId : noteIdToUpsert;
          
          setNotes(prev => {
              const newState = {...prev};
              if (isTitleChanged && newState[oldTitle]) { // 이 코드는 이제 예비용
                  delete newState[oldTitle];
              }
              newState[title] = { content, note_id: finalNoteId, title };
              return newState;
          });
          // 링크 상태도 로컬에서 업데이트 (새 노트 생성 시)
          const newLinks = extractDstLinks(content).map(dst => ({ source: title, target: dst }));
          if (newLinks.length > 0) {
              setLinks(prev => [...prev.filter(l => l.source !== title), ...newLinks]);
          }
        }
        
        // 함수 호출자에게 필요한 정보를 반환
        return { success: true, noteId: response.insertId || noteIdToUpsert, isNewNote: (noteIdToUpsert === -2), response };

      } else {
        throw new Error(response?.error || '노트 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('노트 저장 실패:', err);
      toast.error(err.message || '노트를 저장할 수 없습니다.');
      throw err;
    }
  }, [resourceAPI, loadNotes]);

  // region Link 추출? 백엔드에서 함.
  function extractDstLinks(content) {
    const regex = /\[\[(.*?)\]\]/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }
  // region 노트 내용 가져오기2?
  const getNoteContent = useCallback(async (noteId, groupId) => {
    if (!noteId || !groupId) return;
    try {
        const response = await resourceAPI.getNoteContent(noteId, groupId);
        if (response && typeof response.content === 'string') {
            setNotes(prev => {
                const noteTitle = Object.keys(prev).find(key => prev[key].note_id === noteId);
                if (noteTitle) {
                    return { ...prev, [noteTitle]: { ...prev[noteTitle], content: response.content } };
                }
                return prev;
            });
            setActiveNoteContent(response.content);
            return response;
        }
    } catch (error) {
        console.error('노트 내용 가져오기 실패:', error);
        toast.error('노트 내용을 불러올 수 없습니다.');
        throw error;
    }
  }, [resourceAPI]);

  // region 이건 뭐하는 함수지
  const createOrAppendKeywordNote = useCallback(async (groupId, keyword, newContent) => {
    try {
      // notes state에서 기존 노트 정보를 찾습니다.
      const existingNote = Object.values(notes).find(note => note.title === keyword);
      
      if (existingNote && existingNote.note_id) {
        // 노트가 이미 존재하면, 전체 내용을 서버에서 다시 가져옵니다.
        const fullNote = await resourceAPI.getNoteContent(existingNote.note_id, groupId);
        const oldContent = fullNote.content || '';
        const combinedContent = `${oldContent}\n\n---\n\n${newContent}`;
        
        // 합쳐진 내용으로 서버에 업데이트 요청을 보냅니다.
        const upsertResponse = await upsertNote(groupId, keyword, combinedContent, existingNote.note_id, keyword);
        
        // ✨ UI 업데이트를 위해 최종 ID와 '합쳐진 전체 내용'을 반환합니다.
        return { noteId: upsertResponse.noteId, content: combinedContent };

      } else {
        // 노트가 없으면, 새로 생성 요청을 보냅니다.
        const upsertResponse = await upsertNote(groupId, keyword, newContent, null, null);
        
        // ✨ UI 업데이트를 위해 새 ID와 '초기 내용'을 반환합니다.
        return { noteId: upsertResponse.noteId, content: newContent };
      }
    } catch (error) {
      console.error(`'${keyword}' 노트 처리 실패:`, error);
      throw error;
    }
  }, [notes, resourceAPI, upsertNote, getNoteContent]); // 의존성 배열에 getNoteContent 추가
  // region 노트 삭제
  const deleteNote = useCallback(async (noteId, groupId) => {
    try {
      await resourceAPI.deleteNote(noteId, groupId);
      await loadNotes(groupId);
      toast.success('노트가 삭제되었습니다.');
    } catch (error) {
      console.error('노트 삭제 실패:', error);
      toast.error('노트 삭제에 실패했습니다.');
      // throw error;
    }
  }, [resourceAPI, loadNotes]);
  // region local에서 노트 생성
  const createNoteFromTitle = useCallback((title) => {
    if (notes[title]) {
      return;
    }
    const content = `# ${title}\n\n`;
    setNotes(prev => ({ 
        ...prev, 
        [title]: { 
            content,
            note_id: `temp-${Date.now()}`,
            title 
        } 
    }));
    toast.success(`"${title}" 노트가 생성되었습니다. 저장(Ctrl+S)하여 서버에 등록하세요.`);
  }, [notes]);
  // region 노트 내용 가져오기
  const legacy_getNoteContent = async (note_id, group_id) => {
    try {
      const response = await resourceAPI.getNoteContent(note_id, group_id);
      console.log(response);
      return response && typeof response.content === 'string' ? response.content : '';
    } catch (err) {
      console.error(`[Legacy] 노트 내용 조회 실패 (note_id: ${note_id}):`, err);
      return '';
    }
  };
  // region 전체노트 가져오기
  const loadNotes_lagacy = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoading(true);
    try {
      const response = await resourceAPI.getGroupNotes(groupId);
      if (response.titles) {
        const notesObject = {};
        const noteIdToTitleMap = {};
        const contentPromises = response.titles.map(note => 
          legacy_getNoteContent(note.note_id, groupId).then(content => ({ note, content }))
        );
        const noteContents = await Promise.all(contentPromises);
        
        noteContents.forEach(({ note, content }) => {
          notesObject[note.title] = { content: content || '', note_id: note.note_id, title: note.title };
          noteIdToTitleMap[note.note_id] = note.title;
        });
        
        setNotes(notesObject);
        setCurrentGroupId(groupId);
        
        if (response.links) {
          const linksFormatted = response.links.map(link => {
            const sourceTitle = noteIdToTitleMap[link.src_note_id];
            const targetTitle = link.dst_title;
            return sourceTitle && targetTitle ? { source: sourceTitle, target: targetTitle } : null;
          }).filter(Boolean);
          setLinks(linksFormatted);
        }
        
        toast.success(`레거시 로드: 노트 ${response.titles.length}개 로드됨`);
        return response;
      }
    } catch (err) {
      console.error('레거시 노트 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [resourceAPI]);
  // region GraphData 만들기(Graph에 꼭 필요함)
  const graphData = useMemo(() => {
    if (!notes || Object.keys(notes).length === 0) return { nodes: [], links: [] };
    const realNodes = Object.keys(notes).map(id => ({ id, inactive: false }));
    const safeLinks = JSON.parse(JSON.stringify(links));
    const linkNodeIds = new Set(safeLinks.flatMap(l => [l.source, l.target]));
    const missingNodes = Array.from(linkNodeIds)
      .filter(id => id && !notes[id])
      .map(id => ({ id, inactive: true }));
    return { nodes: [...realNodes, ...missingNodes], links: safeLinks };
  }, [notes, links]);
  // region Socket 관련 UseEffect
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);
  //  region export우
  const value = {
    notes, setNotes,
    links, setLinks,
    loading, setLoading,
    graphData,
    currentGroupId, setCurrentGroupId,
    currentNoteId, setCurrentNoteId,
    activeNoteContent, setActiveNoteContent,
    loadNotes,
    upsertNote,
    getNoteContent,
    deleteNote,
    createOrAppendKeywordNote,
    createNoteFromTitle,
    loadNotes_lagacy,
    socketRef, docRef
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}