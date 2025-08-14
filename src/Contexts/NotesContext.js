import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { toast } from 'react-hot-toast';
import { getResourceAPI } from './APIs/ResourceAPI';
import { useGroups } from './GroupContext';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

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
  
  const {joinSocketGroup} = useGroups();
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
            return response && typeof response.content === 'string' ? response : '';
          } catch (err) {
            console.error(`노트 내용 조회 실패 (note_id: ${note_id}):`, err);
            return '';
          }
        };

        const contentPromises = response.titles.map(note =>
          getNoteContentForLoad(note.note_id, groupId).then(response => ({ note, response }))
        );
        const noteContents = await Promise.all(contentPromises);

        noteContents.forEach(({ note, response }) => {
          // 모든 필드 포함하여 저장
          notesObject[response.title] = {
            content: response.content || '',
            note_id: note.note_id,
            title: note.title,
            created_at: response.created_at,
            update_at: response.update_at,
            subject_id: response.subject_id,
            group_id: response.group_id
          };
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

        try {
          await joinSocketGroup(groupId);
          console.log(`Socket.IO 그룹 ${groupId} 참여 완료`);
        } catch (socketError) {
          console.error('Socket.IO 그룹 참여 실패:', socketError);
        }

        toast.success(`노트 ${response.titles.length}개 로드됨`);
        return response;
      } else {
        setNotes({});
        setLinks([]);
      }




    } catch (err) {
      console.error('노트 로드 실패:', err);
      toast.error('노트 목록을 불러올 수 없습니다.');
      setNotes({});
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [resourceAPI, joinSocketGroup]);

  const createYjsProvider = useCallback((note_id, subject_id) => {
    // 문서명 규칙: note-<note_id>-<subject_id>
    const documentName = `note-${note_id}-${subject_id}`;

    const ydoc = new Y.Doc();

    const provider = new HocuspocusProvider({
      url: 'wss://login.memoriatest.kro.kr', // 서버 WebSocket 주소
      name: documentName,
      document: ydoc,
    });

    return { ydoc, provider };
  },[]);


  // region upsert note
  const upsertNote = useCallback(async (group_id, title, content, note_id = null, oldTitle = null) => {
    const noteIdToUpsert = (note_id === -2 || !note_id) ? -2 : note_id;
    try {
      const response = await resourceAPI.upsertNote(group_id, title, content, noteIdToUpsert);

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
            const newState = { ...prev };
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

  // region 이건 뭐하는 함수지 => ai기능에 필요한듯
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

  // region 개별 노트 리로드
  const refreshSingleNote = useCallback(async (noteId, groupId, titleChangeInfo = null) => {
    try {
      const response = await resourceAPI.getNoteContent(noteId, groupId);

      if (response && typeof response === 'object') {
        setNotes(prev => {
          const newState = { ...prev };

          // 제목 변경 정보가 있는 경우
          if (titleChangeInfo) {
            const { oldTitle, newTitle } = titleChangeInfo;

            // 기존 노트 삭제
            if (oldTitle && newState[oldTitle] && newState[oldTitle].note_id === noteId) {
              delete newState[oldTitle];
              console.log(`제목 변경: "${oldTitle}" → "${newTitle}"`);
            }

            // 새 제목으로 노트 설정
            newState[newTitle] = {
              content: response.content || '',
              note_id: noteId,
              title: newTitle,
              update_at: response.update_at,
              created_at: response.created_at,
              subject_id: response.subject_id,
              group_id: response.group_id
            };
          } else {
            // 제목 변경 없이 메타데이터만 업데이트
            const existingEntry = Object.entries(newState).find(([key, value]) => value.note_id === noteId);

            if (existingEntry) {
              const [currentTitle, currentNote] = existingEntry;
              newState[currentTitle] = {
                ...currentNote,
                content: response.content || currentNote.content,
                update_at: response.update_at,
                created_at: response.created_at || currentNote.created_at,
                subject_id: response.subject_id || currentNote.subject_id,
                group_id: response.group_id || currentNote.group_id
              };
            }
          }

          return newState;
        });
      }
    } catch (error) {
      console.error('개별 노트 새로고침 실패:', error);
      throw error;
    }
  }, [resourceAPI]);



  // region 전체노트 가져오기
  const loadNotes_lagacy = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoading(true);
    try {
      const response = await resourceAPI.getGroupNotes(groupId);
      if (response.titles) {
        const notesObject = {};
        const noteIdToTitleMap = {};

        // 각 노트의 상세 정보 가져오기
        const contentPromises = response.titles.map(async (note) => {
          const contentResponse = await resourceAPI.getNoteContent(note.note_id, groupId);

          // 응답 구조에 따라 처리
          let content = '';
          let metadata = {};

          if (contentResponse && typeof contentResponse === 'object') {
            // 새로운 구조: 객체로 응답
            content = contentResponse.content || '';
            metadata = {
              update_at: contentResponse.update_at,
              created_at: contentResponse.created_at || note.created_at,
              subject_id: contentResponse.subject_id || note.subject_id,
              group_id: contentResponse.group_id || note.group_id
            };
          } else if (typeof contentResponse === 'string') {
            // 이전 구조: 문자열로 응답
            content = contentResponse;
            metadata = {
              update_at: note.update_at,
              created_at: note.created_at,
              subject_id: note.subject_id,
              group_id: note.group_id
            };
          }

          return { note, content, metadata };
        });

        const noteContents = await Promise.all(contentPromises);

        noteContents.forEach(({ note, content, metadata }) => {
          notesObject[note.title] = {
            content: content || '',
            note_id: note.note_id,
            title: note.title,
            // 메타데이터 추가
            ...metadata
          };
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
      toast.error('노트 목록을 불러올 수 없습니다.');
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
    refreshSingleNote,
    createYjsProvider
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}