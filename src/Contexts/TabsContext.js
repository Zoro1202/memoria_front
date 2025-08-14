// 파일: src/Contexts/TabsContext.js


import React, { createContext, useContext, useState, useEffect } from "react";
import { useNotes } from "./NotesContext";

const TabsContext = createContext();


export function TabsProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const {setCurrentNoteId} = useNotes();

  const openTab = (tab) => {
    if(tab.type === 'note')
      tab.noteId = String(tab.noteId);
    const exists = tabs.find(t => t.noteId === tab.noteId && t.type === tab.type);
    if (exists) {
      setCurrentNoteId(tab.noteId);
      setActiveTabId(exists.id);
      return;
    }
    const newId = Date.now().toString();
    const newTab = { ...tab, id: newId };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    return newId;
  };


  useEffect(() => {
    if (!tabs.find(tab => tab.id === activeTabId)) {
      if (tabs.length > 0) {
        setActiveTabId(tabs[0].id);
      } else {
        setActiveTabId(null);
      }
    }
  }, [tabs, activeTabId]);


  const closeTab = (id) => {
    setTabs(prev => prev.filter(t => t.id !== id));
  };

  // FIXME
  const clostTab_noteID =(note_id) =>{
    setTabs(prev => prev.filter(t=> t.noteId !== note_id));
  }
  //note탭만 닫기
  const closeAllNoteTab = () => {
    setTabs(prev => prev.filter(t => t.type !== 'note'));
  }

  // FIXME
  const noteIdFromTab = (tabId) => {
    const tab = tabs.find(t => t.id === tabId && t.type === 'note');
    return tab?.noteId ?? null;
  };
 
  // ✅ [수정] updateTitle 함수를 noteId 기준으로 동작하도록 변경합니다.
  // 이제 이 함수는 "이전 노트 ID"와 "새로운 노트 ID(제목)"를 받습니다.
  const updateTitle = (oldNoteTitle, newNoteTitle) => {
    setTabs(prevTabs =>
      prevTabs.map(tab => {
        // 현재 탭이 변경하려는 노트(oldNoteId)를 열고 있는 경우
        if (tab.title === oldNoteTitle) {
          // 탭의 제목과 noteId를 모두 새로운 값으로 업데이트합니다.
          return { ...tab, title: newNoteTitle, }; // FIXME
        }
        return tab; // 그 외의 탭은 그대로 둡니다.
      })
    );
  };
 
  return (
    <TabsContext.Provider value={{
      tabs,
      activeTabId,
      setTabs,
      setActiveTabId,
      openTab,
      closeTab,
      clostTab_noteID,
      closeAllNoteTab,
      noteIdFromTab,
      updateTitle // 수정된 함수를 전달
    }}>
      {children}
    </TabsContext.Provider>
  );
}


export function useTabs() {
  return useContext(TabsContext);
}
