import React, { useState, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";
import './VaultManager.css';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Note from '../Note/Note';
import GraphView from '../Graph/Graph';

const VaultManager = forwardRef((props, ref) => {
  //state 관련
  const [notes, setNotes] = useState({
    "Welcome": "# Welcome\nThis is **your first note**!",
    "test-embedding": "# test-embedding\n\n* write something …",
    "test-embedding2": "# test-embedding2\n\n* write something else …",
    "test-embedding3": "# test-embedding3\n\n* write something more …",
    "test-embedding4": "# test-embedding4\n\n* write something again …",
  });
  
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [error, setError] = useState('');
  // notes 가 바뀌면 호출, 아니면 호출되지 않고 그냥 notes의 값을 사용
  const graphData = useMemo(
    () => ({
      nodes: Object.keys(notes).map((id) => ({ id })),
      links: [
        { source: "Welcome", target: "test-embedding" },
        { source: "Welcome", target: "test-embedding2" },
        { source: "test-embedding", target: "test-embedding3" },
        { source: "test-embedding2", target: "test-embedding4" },
        { source: "test-embedding3", target: "test-embedding4" },
      ],
    }),
    [notes]
  );
  //tabs (의존성 배열)state가 바뀌면 호출
  const addTab = useCallback(() => {
    if (tabs.length >= 30) {
      setError('탭 한도가 초과되었습니다');
      return;
    }
    const newId = (tabs.length ? Math.max(tabs.map(t => parseInt(t.id))) + 1 : 1).toString();
    const newTab = { id: newId, title: `빈 노트 ${newId}`, type: 'note' };
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newId);
    setError('');
  }, [tabs]);

  const addGraphTab = useCallback(() => {
    if (tabs.length >= 30) {
      setError('탭 한도가 초과되었습니다');
      return;
    }
    const newId = (tabs.length ? Math.max(...tabs.map(t => parseInt(t.id))) + 1 : 1).toString();
    const newTab = { id: newId, title: '그래프 뷰', type: 'graph' };
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newId);
    setError('');
  }, [tabs]);

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

          <div className="vault-content-area">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className="vault-tab-content"
                style={{ display: tab.id === activeTabId ? 'block' : 'none', flex: 1 }}
              >
                {tab.type === 'graph' ? (
                  <GraphView
                    data={graphData}
                    onSelect={(id) => {
                      const newId = (tabs.length ? Math.max(...tabs.map(t => parseInt(t.id))) + 1 : 1).toString();
                      const newTab = { id: newId, title: id, type: 'note', noteId: id };
                      setTabs([...tabs, newTab]);
                      setActiveTabId(newId);
                    }}
                  />
                ) : (
                  <Note 
                    id={tab.noteId || 'Welcome'}
                    markdown={notes[tab.noteId || 'Welcome'] ?? ""}
                    onChange={(md) => setNotes({ ...notes, [tab.noteId || 'Welcome']: md })}
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
