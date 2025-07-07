// src/Contexts/NotesContext.js (최종 확인 버전)

import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { toast } from 'react-hot-toast';
import { deleteNoteFromDB } from '../Components/Note/note_summary';

const NotesContext = createContext();

export function useNotes() {
  return useContext(NotesContext);
}

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState({
    "Welcome": { content: "# Welcome\nThis is **your first note**!" },
  });
  const [activeNoteContent, setActiveNoteContent] = useState('');
  const [links, setLinks] = useState([]);

  // ✅ [추가] AI가 생성한 제목을 임시로 저장할 상태
  const [aiGeneratedTitle, setAiGeneratedTitle] = useState(null);


  const createNoteFromTitle = useCallback((title) => {
    const nt = new Set(Object.keys(notes));
    if (nt.has(title)) return;
    const content = `# ${title}\n**${title} 노트 작성!**`;
    setNotes(prev => ({ ...prev, [title]: { content } }));
  }, [notes]);

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
        // 제목이 변경되면 기존 노트를 복사하고 이전 것은 삭제합니다.
        const oldNoteData = newNotes[oldId];
        delete newNotes[oldId];
        newNotes[id] = { ...oldNoteData, content }; // note_id 등 기존 정보 유지
    } else {
        // 제목 변경 없이 내용만 업데이트합니다.
        newNotes[id] = { ...newNotes[id], content };
    }
    
    setNotes(newNotes);
    return id;
  }, [notes]);

  const deleteExistingNote = useCallback(async (noteTitle) => {
    const noteToDelete = notes[noteTitle];
    if (!noteToDelete || !noteToDelete.note_id) {
        throw new Error("삭제할 노트의 DB ID를 찾을 수 없습니다.");
    }
    try {
        await deleteNoteFromDB(noteToDelete.note_id);
        setNotes(prevNotes => {
            const newNotes = { ...prevNotes };
            delete newNotes[noteTitle];
            return newNotes;
        });
    } catch (error) {
        console.error("Context에서 노트 삭제 중 오류:", error);
        throw error;
    }
  }, [notes, setNotes]);

  const graphData = useMemo(() => {
    const noteNodeIds = Object.keys(notes);
    const realNodes = noteNodeIds.map(id => ({ id, inactive: false }));
    const linkNodeIds = new Set(links.flatMap(l => [typeof l.source === 'string' ? l.source : l.source.id, typeof l.target === 'string' ? l.target : l.target.id]));
    const cleanedLinks = links.map(link => ({ source: typeof link.source === 'string' ? link.source : link.source.id, target: typeof link.target === 'string' ? link.target : link.target.id }));
    const missingNodes = Array.from(linkNodeIds).filter(id => !noteNodeIds.includes(id)).map(id => ({ id, inactive: true }));
    return { nodes: [...realNodes, ...missingNodes], links: cleanedLinks };
  }, [notes, links]);

  const updateGraphLinksFromContent = useCallback((sourceId, markdownContent) => {
    const pattern = /\[\[([^[\]]+)\]\]/g;
    const matches = [...markdownContent.matchAll(pattern)];
    const linkedTitles = matches.map(match => match[1]);

    linkedTitles.forEach(targetId => {
      if (!targetId || sourceId === targetId.trim()) return;
      createNoteFromTitle(targetId.trim());
      setLinks(prev => {
        const alreadyLinked = prev.some(l => l.source === sourceId && l.target === targetId.trim());
        if (alreadyLinked) return prev;
        return [...prev, { source: sourceId, target: targetId.trim() }];
      });
    });
  }, [setLinks, createNoteFromTitle]);

  const value = {
    notes,
    setNotes,
    links,
    setLinks,
    graphData,
    updateNote, // ✅ 여기에 updateNote가 정상적으로 포함되어 있습니다.
    createNoteFromTitle,
    updateGraphLinksFromContent,
    activeNoteContent,
    setActiveNoteContent,
    deleteExistingNote,
    aiGeneratedTitle,
    setAiGeneratedTitle,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}