// src/Contexts/NotesContext.js

import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { toast } from 'react-hot-toast';

const NotesContext = createContext();

export function useNotes() {
  return useContext(NotesContext);
}

export function NotesProvider({ children }) {
  // `notes`의 각 항목을 { content: "..." } 객체 형태로 통일합니다.
  const [notes, setNotes] = useState({
    "Welcome": { content: "# Welcome\nThis is **your first note**!" },
    "test-embedding": { content: "# test-embedding\n\n* write something …\n[[asdf]]\n" },
    "test-embedding2": { content: "# test-embedding2\n\n* write something else …" },
    "test-embedding3": { content: "# test-embedding3\n\n* write something more …" },
    "test-embedding4": { content: "# test-embedding4\n\n* write something again …" },
  });

  // AI 도우미가 사용할, 현재 활성화된 노트의 내용을 담을 상태
  const [activeNoteContent, setActiveNoteContent] = useState('');

  const [links, setLinks] = useState([
    { source: "Welcome", target: "test-embedding" },
    { source: "Welcome", target: "test-embedding2" },
    { source: "test-embedding", target: "test-embedding3" },
    { source: "test-embedding3", target: "1" },
    { source: "test-embedding3", target: "4" },
    { source: "test-embedding3", target: "10" },
  ]);

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

    const lines = content.split('\n');
    const firstLine = lines[0];
    if (!/^# /.test(firstLine)) {
      content = `# ${id}\n${content}`;
    }

    const newNotes = { ...notes };
    if(oldId !== id) {
        delete newNotes[oldId];
    }
    
    // content만 업데이트
    newNotes[id] = { ...newNotes[id], content };
    setNotes(newNotes);
    return id;
  }, [notes]);

  const graphData = useMemo(() => {
    const noteNodeIds = Object.keys(notes);
    const realNodes = noteNodeIds.map(id => ({ id, inactive: false }));

    const linkNodeIds = new Set();
    const cleanedLinks = [];
    links.forEach(link => {
      const source = typeof link.source === "string" ? link.source : link.source.id;
      const target = typeof link.target === "string" ? link.target : link.target.id;
      linkNodeIds.add(source);
      linkNodeIds.add(target);
      cleanedLinks.push({ source, target });
    });
    const missingNodes = Array.from(linkNodeIds)
      .filter(id => !noteNodeIds.includes(id))
      .map(id => ({ id, inactive: true }));

    return {
      nodes: [...realNodes, ...missingNodes],
      links: cleanedLinks,
    };
  }, [notes, links]);

  const updateGraphLinksFromContent = useCallback((sourceId, markdownContent) => {
    const pattern = /\[\[([^[\]]+)\]\]/g;
    const matches = [...markdownContent.matchAll(pattern)];
    const linkedTitles = matches.map(match => match[1]);

    linkedTitles.forEach(targetId => {
      if (!targetId || sourceId === targetId.trim()) return;
      createNoteFromTitle(targetId.trim());

      setLinks(prev => {
        const alreadyLinked = prev.some(
          l => l.source === sourceId && l.target === targetId.trim()
        );
        if (alreadyLinked) return prev;
        return [...prev, { source: sourceId, target: targetId.trim() }];
      });
    });
  }, [setLinks, createNoteFromTitle]);

  // Provider에 전달할 모든 상태와 함수를 여기에 포함시킵니다.
  const value = {
    notes,
    setNotes,
    links,
    setLinks,
    graphData,
    updateNote,
    createNoteFromTitle,
    updateGraphLinksFromContent,
    activeNoteContent,     // AI 도우미용 상태
    setActiveNoteContent,  // AI 도우미용 상태 업데이트 함수
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}