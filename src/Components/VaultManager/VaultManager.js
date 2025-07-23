// vaultmanager.js - 김형우, 이상영
import React, { useState, useMemo, forwardRef, useImperativeHandle, useCallback, useEffect } from "react";
import './VaultManager.css';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Note from '../Note/Note';
import GraphView from '../Graph/Graph';
// import GraphView3D from "../Graph/3D/3DGraph"; // 금지
import { useNotes } from "../../Contexts/NotesContext";
import { useTabs } from "../../Contexts/TabsContext";
import { useGroups } from "../../Contexts/GroupContext";
import { getResourceAPI } from "../../Contexts/APIs/ResourceAPI";
import toast from "react-hot-toast";
import { Button } from "../Note/Util/noteComponent";

const VaultManager = forwardRef((props, ref) => {
  //state 관련
  const [error, setError] = useState('');

  const {notes, setNotes, graphData, setActiveNoteContent, upsertNote,loadNotes } = useNotes();
  const {tabs, setTabs, activeTabId, setActiveTabId, openTab} = useTabs();
  const {selectedGroupId, sid, user} = useGroups();


  const resourceAPI = useMemo(() => getResourceAPI(), []);

  // DOM 렌더링 시에 사용자 정보를 API로부터 가져와야 함. (로그인 화면에서 리다이렉트->쿠키에 엑세스 토큰 있어야 함.)
  // useEffect(() => { // 이거 Sidebar에서 하고있고 context로 바로 넘기고있어서 할필요 없음!!!
    // resourceAPI.
  // }, []);

  //tabs (의존성 배열)state가 바뀌면 호출
  const addTab = useCallback(() => {
    if (tabs.length >= 30) {
      setError('탭 한도가 초과되었습니다');
      return;
    }
    const newId = "새 노트 " + (Object.keys(notes).length + 1);
    const newContent = "# " + newId + "\n**새 노트!**";
    // 여기 upsertnote로 바꾸고 opentab은 안바꿔도 될듯.(upsertnote 현재 작동 X)
    // setNotes(prev => ({
    //   ...prev,
    //   [newId]: {
    //     content: newContent,
    //     update_at: new Date().toISOString(),
    //   },
    // }));
    try {
      if(!selectedGroupId) { toast.error('그룹을 선택하세요'); return;}
      upsertNote(selectedGroupId, newId, newContent);
    } catch (err){
      console.log(`[AddTab] ${err}`);
      toast.error('새 노트 추가 실패!');
    }
    openTab({ title: newId, type: "note", noteId: newId });
    setError('');
    return newId;
  }, [tabs, notes, setNotes, openTab]); // 의존성 배열에 notes, setNotes, openTab 추가

  const addGraphTab = useCallback(() => {
    if (tabs.length >= 30) {
      setError('탭 한도가 초과되었습니다');
      return;
    }
    // [수정됨] id 생성 로직을 더 안전하게 변경
    // const newId = `graph-${Date.now()}`;
    // const newTab = { id: newId, title: '그래프 뷰', type: 'graph' };
    openTab({ title: "Graph", type: "graph" });
    // setTabs(prevTabs => [...prevTabs, newTab]);
    // setActiveTabId(newId);
    setError('');
  }, [tabs, setTabs, setActiveTabId]); // 의존성 배열에 setTabs, setActiveTabId 추가

  useImperativeHandle(ref, () => ({
    addTab,
    addGraphTab
  }), [addTab, addGraphTab]);

  const closeTab = (id) => {
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    if (activeTabId === id && newTabs.length) {
      setActiveTabId(newTabs[0].id);
    } else if (newTabs.length === 0) {
      setActiveTabId(null);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(tabs);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setTabs(reordered);
  };

  return (
    <div className={`vaultmanager-wrapper ${tabs.length === 0 ? 'no-notes' : ''}`} onClick={tabs.length === 0 ? addTab : undefined}>
      {tabs.length === 0 && (
        <div className="add-new-overlay">
          <span className="plus-icon">+</span>
          <span>새 노트 추가</span>
        </div>
      )}

      {tabs.length > 0 && (
        <>
          <div className="tab-bar">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="tabs" direction="horizontal">
                {(provided) => (
                  <div className="tabs-wrapper" ref={provided.innerRef} {...provided.droppableProps}>
                    <div className="tabs-container">
                      {tabs.map((tab, index) => (
                        <Draggable key={tab.id} draggableId={tab.id} index={index}>
                          {(provided) => (
                            <div
                              className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setActiveTabId(tab.id)}
                            >
                              <span className="tab-title">{tab.title}</span>
                              <button
                                className="close-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeTab(tab.id);
                                }}
                                aria-label="탭 닫기"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                    <button className="add-tab-button" onClick={addTab} aria-label="새 창 추가">＋</button>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
          
          {/* [수정됨] 스크롤이 적용될 콘텐츠 영역 */}
          <div className="vault-content-area">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className="vault-tab-content"
                style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
              >
                {tab.type === 'graph' ? (
                  <GraphView
                    data={graphData}
                    onSelect={(id) => {
                      // 그래프 노드 클릭 시 새 탭 열기 로직
                      openTab({ title: id, type: 'note', noteId: id });
                      if(!notes[id])
                      {
                        upsertNote(selectedGroupId, id, id);
                        loadNotes();
                      }
                    }}
                  />
                ) : (
                  <Note
                    id={tab.title}
                    // noteId={notes[tab.title].}
                    groupId={tab.groupId || selectedGroupId}
                    markdown={notes[tab.noteId]?.content || "error"}
                    onChange={(md) => {
                      setActiveNoteContent(String(md));
                      // upsertNote(selectedGroupId, tab.title, md, tab.noteId); // 저장 upsert인데 이거 수정해야함.
                      setNotes((prevNotes) => ({
                        ...prevNotes,
                        [tab.title]: {
                          ...prevNotes[tab.title],
                          content: String(md),
                          update_at: new Date().toISOString(),
                        },
                      }));
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
});

export default VaultManager;