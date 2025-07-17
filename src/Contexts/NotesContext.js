// src/Contexts/NotesContext.js
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { toast } from 'react-hot-toast';
import {getResourceAPI} from './APIs/ResourceAPI';
import io from 'socket.io-client';
import ShareDBClient from 'sharedb-client';

const NotesContext = createContext();

export function useNotes() {
  return useContext(NotesContext);
}

export function NotesProvider({ children }) {
  const resourceAPI = getResourceAPI();
  const [notes, setNotes] = useState({});
  const [activeNoteContent, setActiveNoteContent] = useState('');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [aiGeneratedTitle, setAiGeneratedTitle] = useState(null);
  
  // Socket.IO 및 ShareDB 관련
  const socketRef = useRef(null);
  const connectionRef = useRef(null);
  const docRef = useRef(null);

  // Socket 연결 함수
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

    // ShareDB 스트림 설정
    const stream = {
      write: (msg) => {
        const serialized = JSON.stringify(msg);
    socketRef.current.emit('sharedb', serialized);
      },
      on: (event, handler) => {
        if (event === 'data') {
          socketRef.current.on('sharedb', (data) => {
            const msg = JSON.parse(data);
            handler(msg);
          });
        }
        if (event === 'close') {
          socketRef.current.on('disconnect', handler);
        }
      }
    };

    connectionRef.current = new ShareDBClient.Connection(stream);

    // 소켓 이벤트 리스너 등록
    registerSocketListeners();

    socketRef.current.on('connect', () => {
      console.log('Socket 연결됨');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket 연결 해제:', reason);
    });
  }, []);

  // Socket 이벤트 리스너 등록
  const registerSocketListeners = useCallback(() => {
    if (!socketRef.current || !connectionRef.current) {
      console.error('ShareDB connection이 아직 생성되지 않음!');
      return;
    }

    // 노트 로드 이벤트
    socketRef.current.on('note_loaded', (data) => {
      if (!data || data.noteId === undefined) {
        console.error('note_loaded ERROR : data 반환 오류');
        return;
      }

      docRef.current = connectionRef.current.get('notes', data.noteId);
      docRef.current.subscribe(function (err) {
        if (err) throw err;
        
        // Context 상태 업데이트
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

      // ShareDB 변경 이벤트 리스너
      docRef.current.on('op', function (op, source) {
        if (!source) {
          // 다른 사용자의 변경 사항을 Context에 반영
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

    // 실시간 업데이트 수신
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

    // 에러 처리
    socketRef.current.on('edit_error', (err) => {
      console.error('노트 편집 에러:', err);
      toast.error(`노트 편집 실패: ${err.message}`);
    });

    socketRef.current.on('join_error', (err) => {
      toast.error(err.message || '노트 입장에 실패했습니다.');
      socketRef.current.disconnect();
    });

    // 사용자 입장/퇴장 이벤트
    socketRef.current.on('user_joined', (data) => {
      console.log(`사용자 입장: ${data.userId}`);
    });

    socketRef.current.on('user_left', (data) => {
      console.log(`사용자 퇴장: ${data.userId}`);
    });

  }, [currentNoteId]);

  // Socket 연결 해제
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

  // 노트 목록 로드 (API)
  const loadNotes = useCallback(async (groupId) => {
    setLoading(true);
    try {
      const response = await resourceAPI.getGroupNotes(groupId);
      console.log('노트 데이터:', response);
      
      if (response && response.titles) {
        const notesObject = {};
        // note_id를 키로 하는 맵 생성 (ID -> 제목 변환용)
        const noteIdToTitleMap = {};
        
        response.titles.forEach(note => {
          notesObject[note.title] = {
            content: '', // 실제 내용은 소켓으로 로드
            note_id: note.note_id,
            title: note.title
          };
          
          // ID -> 제목 매핑
          noteIdToTitleMap[note.note_id] = note.title;
        });
        
        setNotes(notesObject);
        setCurrentGroupId(groupId);
        
        // 링크 설정 - ID를 제목으로 변환
        if (response.links) {
          const linksFormatted = response.links
          .map(link => {
            const sourceTitle = noteIdToTitleMap[link.src_note_id];
            const targetTitle = link.dst_title;
            
              // source와 target 모두 존재하는 경우만 링크 생성
              if (sourceTitle && targetTitle) {
                return {
                  source: sourceTitle,
                  target: targetTitle
                };
              }
              return null;
            })
            .filter(link => link !== null); // null인 링크 제거
            
            setLinks(linksFormatted);
          }
          
          toast.success(`노트 ${response.titles.length}개 로드됨`);
          return response;
        }
      } catch (err) {
        console.error('노트 로드 실패:', err);
        toast.error('노트 목록을 불러올 수 없습니다.');
        // throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const upsertNote = useCallback(async (group_id, title, content, note_id = -2) => {
    try {
      // setLoading(true);
      const response = await resourceAPI.upsertNote(group_id, title, content, note_id);
      
      if (response && response.success) {
        const isNewNote = note_id === -2;
        const finalNoteId = isNewNote ? response.insertId : note_id;
        
        // 로컬 상태 업데이트
        setNotes(prev => ({
          ...prev,
          [title]: {
            content: content,
            note_id: finalNoteId,
            title: title,
            update_at: new Date().toISOString(),
          }
        }));
        
        // 링크 변경 사항 처리
        if (response.linkChanges) {
          const { inserted, deleted } = response.linkChanges;
          
          if (inserted > 0 || deleted > 0) {
            console.log(`링크 변경: 추가 ${inserted}개, 삭제 ${deleted}개`);
            
            // 그룹의 노트 목록 다시 로드하여 링크 정보 업데이트
            await loadNotes(group_id);
          }
        }
        
        
        // 성공 메시지
        const action = isNewNote ? '생성' : '수정';
        let successMessage = `노트 "${title}"이(가) ${action}되었습니다.`;
        
        if (response.linkChanges) {
          const { inserted, deleted } = response.linkChanges;
          if (inserted > 0 || deleted > 0) {
            successMessage += ` (링크 ${inserted}개 추가, ${deleted}개 삭제)`;
          }
        }
        
        toast.success(successMessage);
        
        return {
          success: true,
          noteId: finalNoteId,
          isNewNote: isNewNote,
          linkChanges: response.linkChanges,
          insertId: response.insertId, // 새 노트 생성 시에만 존재
          message: response.message
        };
      } else {
        throw new Error(response?.error || '노트 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('노트 저장 실패:', err);
      const errorMessage = err.message || '노트를 저장할 수 없습니다.';
      toast.error(errorMessage);
      throw err;
    } finally {
      // setLoading(false);
    }
  }, [setNotes, loadNotes, resourceAPI]);


  // 노트 내용 가져오기 (Socket으로 대체)
  const getNoteContent = useCallback(async (noteId, groupId) => {
    try {
      // Socket을 통해 노트 입장 요청
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('join_note', { noteId, groupId });
      } else {
        // 소켓이 연결되지 않은 경우 API 폴백
        const response = await resourceAPI.getNoteContent(noteId, groupId);
        if (response) {
          setActiveNoteContent(response.content);
          return response;
        }
      }
    } catch (error) {
      console.error('노트 내용 가져오기 실패:', error);
      toast.error('노트 내용을 불러올 수 없습니다.');
      throw error;
    }
  }, []);

  // 노트 삭제
  const deleteNote = useCallback(async (noteId, groupId) => {
    try {
      const response = await resourceAPI.deleteNote(noteId, groupId);
      if (response.success) {
        // 로컬 상태에서 제거
        setNotes(prev => {
          const newNotes = { ...prev };
          const noteToDelete = Object.keys(newNotes).find(
            key => newNotes[key].note_id === noteId
          );
          if (noteToDelete) {
            delete newNotes[noteToDelete];
          }
          return newNotes;
        });
        
        toast.success('노트가 삭제되었습니다.');
        return response;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('노트 삭제 실패:', error);
      toast.error('노트 삭제에 실패했습니다.');
      throw error;
    }
  }, []);

  // ShareDB를 통한 노트 업데이트
  const updateNoteViaSocket = useCallback((field, value) => {
    if (docRef.current) {
      const op = [{ 
        p: [field],
        od: docRef.current.data[field], //이전 데이터
        oi: value // 새로운 데이터, 실제 저장될 데이터임
      }];
      docRef.current.submitOp(op);
    }
  }, []);

  // 기존 업데이트 함수 (로컬 테스트용)
  const updateNote = useCallback((oldId, newId, content) => {
    let id = newId?.trim() || "Untitled";
    const titleSets = new Set(Object.keys(notes));
    titleSets.delete(oldId);

    if (titleSets.has(id)) {
      let suffix = 1;
      while (titleSets.has(`${id} (${suffix})`)) {
        suffix++;
      }
      id = `${id} (${suffix})`;
      if (oldId !== id) {
        toast.error(`파일명 중복! "${id}"로 교체됨.`, { duration: 3500 });
      }
    }

    const newNotes = { ...notes };
    if(oldId !== id && oldId in newNotes) {
      const oldNoteData = newNotes[oldId];
      delete newNotes[oldId];
      newNotes[id] = { ...oldNoteData, content };
    } else {
      newNotes[id] = { ...newNotes[id], content };
    }
    
    setNotes(newNotes);
    return id;
  }, [notes]);

  // 그래프 데이터 계산
  const graphData = useMemo(() => {
    const noteNodeIds = Object.keys(notes);
    const realNodes = noteNodeIds.map(id => ({ id, inactive: false }));
    const linkNodeIds = new Set(links.flatMap(l => [
      typeof l.source === 'string' ? l.source : l.source.id, 
      typeof l.target === 'string' ? l.target : l.target.id
    ]));
    const cleanedLinks = links.map(link => ({ 
      source: typeof link.source === 'string' ? link.source : link.source.id, 
      target: typeof link.target === 'string' ? link.target : link.target.id 
    }));
    const missingNodes = Array.from(linkNodeIds)
      .filter(id => !noteNodeIds.includes(id))
      .map(id => ({ id, inactive: true }));
    
    return { nodes: [...realNodes, ...missingNodes], links: cleanedLinks };
  }, [notes, links]);

  // 노트 생성
  const createNoteFromTitle = useCallback((title) => {
    const nt = new Set(Object.keys(notes));
    if (nt.has(title)) return;
    const content = `# ${title}\n**${title} 노트 작성!**`;
    setNotes(prev => ({ ...prev, [title]: { content } }));
  }, [notes]);

  const regacy_getNoteContent = async (note_id, group_id) => {
    try {
      const response = await resourceAPI.getNoteContent(note_id, group_id);
      
      if (response) {
        if (response.content) {
          return response.content;
        } else if (response.error) {
          throw new Error(response.error);
        }
      }
      
      throw new Error('노트 내용을 찾을 수 없습니다.');
    } catch (err) {
      console.error(`노트 내용 조회 실패 (note_id: ${note_id}, group_id: ${group_id}):`, err);
      throw err; // 에러를 호출자에게 전달
    }
  };


  const loadNotes_lagacy = useCallback(async (groupId) => {
    setLoading(true);
    try {
      const response = await resourceAPI.getGroupNotes(groupId);
      console.log('노트 데이터:', response);
      
      if (response && response.titles) {
        const notesObject = {};
        const noteIdToTitleMap = {};
        
        // 모든 노트 내용을 병렬로 가져오기
        const contentPromises = response.titles.map(note => 
          regacy_getNoteContent(note.note_id, groupId)
            .then(content => ({ note, content }))
            .catch(err => {
              console.error(`노트 ${note.title} 내용 로드 실패:`, err);
              return { note, content: '' };
            })
        );
        
        const noteContents = await Promise.all(contentPromises);
        
        // 결과 처리
        noteContents.forEach(({ note, content }) => {
          notesObject[note.title] = {
            content: content || '',
            note_id: note.note_id,
            title: note.title
          };
          
          noteIdToTitleMap[note.note_id] = note.title;
        });
        
        setNotes(notesObject);
        setCurrentGroupId(groupId);
        
        // 링크 설정
        if (response.links) {
          const linksFormatted = response.links
            .map(link => {
              const sourceTitle = noteIdToTitleMap[link.src_note_id];
              const targetTitle = link.dst_title;
              
              if (sourceTitle && targetTitle) {
                return {
                  source: sourceTitle,
                  target: targetTitle
                };
              }
              return null;
            })
            .filter(link => link !== null);
          
          setLinks(linksFormatted);
        }
        
        toast.success(`노트 ${response.titles.length}개 로드됨`);
        return response;
      }
    } catch (err) {
      console.error('노트 로드 실패:', err);
      toast.error('노트 목록을 불러올 수 없습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  // 컴포넌트 마운트 시 소켓 연결
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket]);

  const value = {
    notes,
    setNotes,
    links,
    setLinks,
    loading,
    graphData,
    currentGroupId,
    currentNoteId,
    activeNoteContent,
    setActiveNoteContent,
    aiGeneratedTitle,
    setAiGeneratedTitle,
    
    // API 함수들
    loadNotes,
    upsertNote,
    getNoteContent,
    deleteNote,
    updateNote,
    createNoteFromTitle,
    
    // Socket 함수들
    connectSocket,
    disconnectSocket,
    updateNoteViaSocket,
    
loadNotes_lagacy,

    // Socket 참조 (필요한 경우)
    socketRef,
    docRef
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}
