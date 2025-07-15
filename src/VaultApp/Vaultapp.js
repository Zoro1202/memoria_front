// src/VaultApp/Vaultapp.js (전체 코드)

import React, { useEffect, useCallback } from "react";
import GraphView from "../Components/Graph/Graph";
import NoteView from "../Components/Note/Note";
import { useNotes } from "../Contexts/NotesContext";
import { useTabs } from "../Contexts/TabsContext";
import { toast, Toaster } from "react-hot-toast";
import AiHelper from "../Components/AI_Assistance/AiHelper";
// ✅ [수정] intelligentSaveNote 대신 saveNote를 사용합니다.

export default function VaultApp() {
  const { 
    notes, setNotes, graphData, createNoteFromTitle, setActiveNoteContent,
    deleteExistingNote
  } = useNotes();
  
  const { tabs, activeTabId, setActiveTabId, openTab, closeTab, noteIdFromTab } = useTabs();

  // 활성 탭 콘텐츠 설정 (변경 없음)
  useEffect(() => {
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      if (activeTab && activeTab.type === 'note') {
        const noteContent = notes[activeTab.noteId]?.content || '';
        setActiveNoteContent(noteContent);
      } else {
        setActiveNoteContent('');
      }
    } else {
      setActiveNoteContent('');
    }
  }, [activeTabId, notes, tabs, setActiveNoteContent]);

  // 로컬 '새 노트' 생성 (변경 없음)
  const createNote = () => {
    const newId = "새 노트 " + (Object.keys(notes).length + 1);
    const newContent = "# " + newId + "\n**새 노트!**";
    setNotes(prev => ({
      ...prev,
      [newId]: {
        content: newContent,
        update_at: new Date().toISOString(),
      },
    }));
    openTab({ title: newId, type: "note", noteId: newId });
    return newId;
  };

  // 노트 삭제 핸들러 (변경 없음)
  const deleteNote = useCallback(async (tabId) => {
    if (!tabId) return;
    const noteTitle = noteIdFromTab(tabId);
    if (!noteTitle) return;

    if (!window.confirm(`정말로 "${noteTitle}" 노트를 삭제하시겠습니까?`)) {
        return;
    }
    
    const note = notes[noteTitle];
    
    if (note && note.note_id) {
        try {
            await deleteExistingNote(noteTitle);
            toast.success(`"${noteTitle}" 노트가 DB에서 삭제되었습니다.`);
            closeTab(tabId);
        } catch (error) {
            toast.error(`삭제 실패: ${error.message}`);
        }
    } 
    else {
        setNotes(prev => {
            const newNotes = { ...prev };
            delete newNotes[noteTitle];
            return newNotes;
        });
        toast.success(`"${noteTitle}" 노트가 삭제되었습니다.`);
        closeTab(tabId);
    }
  }, [notes, noteIdFromTab, closeTab, setNotes, deleteExistingNote]);

  return (
    <div className="vault-container">
      <aside className="toolbar">
        <button onClick={() => openTab({ title: "Graph", type: "graph" })}>🕸️</button>
        <button onClick={createNote}>+📝</button>
        {/* ✅ [수정] 로켓 버튼의 onClick과 title을 변경합니다. */}
        <button title="현재 노트를 DB에 저장">🚀</button>
        <button className="btn-del" onClick={() => deleteNote(activeTabId)}>🗑️</button>
      </aside>
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div
            onClick={() => setActiveTabId(tab.id)}
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? "active" : ""}`}
          >
            {tab.title}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="view-area">
        {tabs.map((tab) =>
          tab.id === activeTabId ? (
            <div key={tab.id} className="view-content">
              {tab.type === "graph" ? (
                <GraphView
                  data={graphData}
                  onSelect={(id) => {
                    createNoteFromTitle(id);
                    openTab({ title: id, type: "note", noteId: id });
                  }}
                />
              ) : (
                <NoteView
                  id={tab.noteId}
                  markdown={notes[tab.noteId]?.content || ""}
                  onChange={(md) => {
                    setActiveNoteContent(String(md));
                    setNotes((prevNotes) => ({
                      ...prevNotes,
                      [tab.noteId]: { ...prevNotes[tab.noteId], content: String(md) },
                    }));
                  }}
                />
              )}
            </div>
          ) : null
        )}
      </div>
      <Toaster />
      <AiHelper />
    </div>
  );
}