//NotesContext.js
//노트 관리 context
//사용하려는 스코프 상위에 provider로 감싸줘야 사용 가능
//나중에 백엔드와 통신해야 함
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import {toast} from 'react-hot-toast';
const NotesContext = createContext();

export function NotesProvider({ children }) {
  //여기서 
  const [notes, setNotes] = useState({
    Welcome: "# Welcome\nThis is **your first note**!",
    "test-embedding": "# test-embedding\n\n* write something …\n[[asdf]]\n",
    "test-embedding2": "# test-embedding2\n\n* write something else …",
    "test-embedding3": "# test-embedding3\n\n* write something more …",
    "test-embedding4": "# test-embedding4\n\n* write something again …",
    // ...
    // "새 노트6":"# 새노트 6\n\n**새 노트!**\n\n[[asdf]]",
  });

  const [links, setLinks] =useState([
    { source: "Welcome", target: "test-embedding" },
    { source: "Welcome", target: "test-embedding2" },
    { source: "test-embedding", target: "test-embedding3" },
    { source: "test-embedding3", target: "1"},
    { source: "test-embedding3", target: "4"},
    { source: "test-embedding3", target: "10"},
    // ...
  ]);

  const createNoteFromTitle = useCallback((title) => {
    // content에서 첫 줄이 # 제목이 아니면 자동으로 붙이기
    const nt = new Set(Object.keys(notes));
    if(nt.has(title))
      return;
    const content = `# ${title}\n**${title} 노트 작성!**`;
    // toast.loading(`${title} 만드는 중...`, {duration:1000});
    // 새로운 notes 구성
    setNotes(prev=>({...prev, [title]:content}));
  },[notes]);

  //함수 캐싱을 위해 useCallback
  //컨트롤 s 누르면 호출되기 때문에 개많이 호출될 예정이므로 useCallback으로 성능 개선
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
    delete newNotes[oldId];
    newNotes[id] = content;
    setNotes(newNotes);
    return id;
  }, [notes, setNotes]); // 의존성에 notes, setNotes 필요
  
  //useMemo useCallback과 동일함.
  const graphData = useMemo(() => {
    const noteNodeIds = Object.keys(notes);
    const realNodes = noteNodeIds.map(id => ({ id, inactive: false }));

    const linkNodeIds = new Set();
    const cleanedLinks = [];
    //links state에서 linkNodeIds로 추출
    links.forEach(link => {
      const source = typeof link.source === "string" ? link.source : link.source.id;
      const target = typeof link.target === "string" ? link.target : link.target.id;
      linkNodeIds.add(source);
      linkNodeIds.add(target);
      cleanedLinks.push({ source, target });
    });
    // 비활성화 노드 적용
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


  

  return (
    <NotesContext.Provider value={{ notes, setNotes, setLinks, graphData, updateNote, createNoteFromTitle, updateGraphLinksFromContent}}>
      {children}
    </NotesContext.Provider>
  );
}

// Hook으로 편하게 사용
export function useNotes() {
  return useContext(NotesContext);
}

