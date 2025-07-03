//탭 관리 context
//사용하려는 스코프 상위에 provider로 감싸줘야 사용 가능
import React, { createContext, useContext, useState, useEffect } from "react";

const TabsContext = createContext();

export function TabsProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  //open tab : 탭 열고 탭 id 할당.
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

  // 탭 바뀔때 실행
  useEffect(() => {
    if (!tabs.find(tab => tab.id === activeTabId)) {
      if (tabs.length > 0) {
        // console.log(`(before Closing...)current Active Tab : ${activeTabId}`);
        setActiveTabId(tabs[0].id);
        // console.log(`first tab : ${tabs[0].id}`); // 이 탭 열림
        //여기서 로그 찍어도 안나옴 usestate에 setstate가 비동기라서 그렇다넹
      } else {
        setActiveTabId(null);
      }
    }
  }, [tabs, activeTabId]); // 탭 닫긴거 감지

  const closeTab = (id) => {
    setTabs(prev => prev.filter(t => t.id !== id)); // 탭 닫기 setTab으로 useEffect에서 tabs 감지
  };
  
  const noteIdFromTab = (tabId) => {
    const tab = tabs.find(t => t.id === tabId && t.type === 'note');
    return tab?.noteId ?? null;
  };

  const updateTitle = (tabId, newTitle) => {
      setTabs(prev =>
        prev.map(tab => (tab.id === tabId ? {...tab, title: newTitle} : tab))
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
      updateTitle
    }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  return useContext(TabsContext);
}
