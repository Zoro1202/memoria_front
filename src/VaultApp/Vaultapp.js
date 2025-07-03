// src/VaultApp/Vaultapp.js

import React, { useState, useEffect } from "react";
import GraphView from "../Components/Graph/Graph";
import NoteView from "../Components/Note/Note";
import { useNotes } from "../Contexts/NotesContext";
import { useTabs } from "../Contexts/TabsContext";
import { toast, Toaster } from "react-hot-toast";
import AiHelper from "../Components/Util/AiHelper";

// ✅ [수정] 더 이상 사용하지 않는 processMeetingAndSave 와 downloadMarkdownFile 을 import 목록에서 제거합니다.
import { listAllNotesFromDB } from "../Components/Note/note_summary";

export default function VaultApp() {
  const { notes, setNotes, graphData, createNoteFromTitle, setActiveNoteContent } = useNotes();
  const { tabs, activeTabId, setActiveTabId, openTab, closeTab, noteIdFromTab } = useTabs();

  useEffect(() => {
    const loadNotesFromDB = async () => {
        try {
            const dbNotes = await listAllNotesFromDB();
            const newNotesFromDB = {};
            dbNotes.forEach((note) => {
                newNotesFromDB[note.title] = {
                    content: note.content,
                    update_at: note.update_at,
                    note_id: note.note_id,
                    owner_id: note.owner_id,
                    group_id: note.group_id,
                };
            });
            setNotes((prevNotes) => ({
                ...prevNotes,
                ...newNotesFromDB,
            }));
        } catch (err) {
            console.error("DB에서 노트 불러오기 실패:", err);
        }
    };
    loadNotesFromDB();
  }, [setNotes]);

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

  const deleteNote = (tid) => {
    if (!tid) return;
    const noteToDeleteId = noteIdFromTab(tid);
    if (!noteToDeleteId) return;
    const newNotes = { ...notes };
    toast.success(`"${noteToDeleteId}" 노트가 삭제되었습니다.`);
    delete newNotes[noteToDeleteId];
    setNotes(newNotes);
    closeTab(tid);
  };

  return (
    <div className="vault-container">
      <aside className="toolbar">
        <button onClick={() => openTab({ title: "Graph", type: "graph" })}>🕸️</button>
        <button onClick={createNote}>+📝</button>
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
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
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
                      [tab.noteId]: {
                        ...prevNotes[tab.noteId],
                        content: String(md),
                        update_at: new Date().toISOString(),
                      },
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