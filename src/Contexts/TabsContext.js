// 파일: src/Contexts/TabsContext.js

import React, { createContext, useContext, useState, useEffect } from "react";

const TabsContext = createContext();

export function TabsProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  const openTab = (tab) => {
    const exists = tabs.find(t => t.noteId === tab.noteId && t.type === tab.type);
    if (exists) {
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
  
  const noteIdFromTab = (tabId) => {
    const tab = tabs.find(t => t.id === tabId && t.type === 'note');
    return tab?.noteId ?? null;
  };
  
  // ✅ [수정] updateTitle 함수를 noteId 기준으로 동작하도록 변경합니다.
  // 이제 이 함수는 "이전 노트 ID"와 "새로운 노트 ID(제목)"를 받습니다.
  const updateTitle = (oldNoteId, newNoteId) => {
    setTabs(prevTabs =>
      prevTabs.map(tab => {
        // 현재 탭이 변경하려는 노트(oldNoteId)를 열고 있는 경우
        if (tab.noteId === oldNoteId) {
          // 탭의 제목과 noteId를 모두 새로운 값으로 업데이트합니다.
          return { ...tab, title: newNoteId, noteId: newNoteId };
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