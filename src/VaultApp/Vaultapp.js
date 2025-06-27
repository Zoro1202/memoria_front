import React, { useState } from "react"; // ✅ 상태 추가
import GraphView from "../Components/Graph/Graph";
import NoteView from "../Components/Note/Note";
import { useNotes } from "../Contexts/NotesContext";
import { useTabs } from "../Contexts/TabsContext";
import { toast, Toaster } from 'react-hot-toast';
import {
  summarizeMeeting,
  generateMarkdown,
  extractKeywords,
  insertSummaryNote,
  downloadMarkdownFile // ✅ 다운로드 함수 임포트
} from "../Components/Note/note_summary";

export default function VaultApp() {
  const { notes, setNotes, graphData, createNoteFromTitle } = useNotes();
  const { tabs, activeTabId, setActiveTabId, openTab, closeTab, noteIdFromTab } = useTabs();

  const [lastSummaryFilename, setLastSummaryFilename] = useState(null); // ✅ 마지막 요약 결과 파일명 기억

  const createNote = () => {
    const newId = '새 노트' + (Object.keys(notes).length + 1);
    const newContent = "# " + newId + "\n**새 노트!**";
    setNotes({
      ...notes,
      [newId]: newContent,
    });
    return newId;
  };

  const deleteNote = (tid) => {
    const newNotes = { ...notes };
    toast.success(`"${noteIdFromTab(tid)}" 노트가 삭제되었습니다.`);
    delete newNotes[noteIdFromTab(tid)];
    setNotes(newNotes);
    closeTab(tid);
  };

  return (
    <div className="vault-container">
      {/* 사이드 툴바 */}
      <aside className="toolbar">
        <button onClick={() => openTab({ title: "Graph", type: "graph" })}>🕸️</button>
        <button onClick={() => {
          const tid = createNote();
          openTab({ title: tid, type: "note", noteId: tid });
        }}>+📝</button>
        <button className="btn-del" onClick={() => deleteNote(activeTabId)}>🗑️</button>
        <button
          onClick={async () => {
            try {
              const currentNoteId = noteIdFromTab(activeTabId);
              const currentNoteContent = notes[currentNoteId];
              if (!currentNoteContent) throw new Error("노트 내용 없음");
              const serializedContent = currentNoteContent;
              const summaryObj = await summarizeMeeting(serializedContent);
              const markdown = await generateMarkdown(summaryObj);
              const newId = insertSummaryNote({
                currentId: currentNoteId,
                markdown,
                notes,
                setNotes,
                openTab,
                setActiveTabId
              });

              if (summaryObj.filename) {
                setLastSummaryFilename(summaryObj.filename); // ✅ 파일명 저장
              }

              toast.success(`요약 탭 생성 완료: ${newId}`);
            } catch (err) {
              toast.error("요약 실패: " + err.message);
            }
          }}
        >📤 요약</button>

        <button
          onClick={() => {
            if (!lastSummaryFilename) {
              toast.error("다운로드할 파일이 없습니다. 먼저 요약을 생성하세요.");
              return;
            }
            downloadMarkdownFile(lastSummaryFilename);
          }}
        >⬇️ 다운로드</button>
      </aside>

      {/* 탭 목록 */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div onClick={() => setActiveTabId(tab.id)} key={tab.id} className={`tab ${tab.id === activeTabId ? "active" : ""}`}>
            {tab.title}
            <button onClick={() => closeTab(tab.id)}>×</button>
          </div>
        ))}
      </div>

      {/* 콘텐츠 뷰 */}
      <div className="view-area">
        {tabs.map((tab) =>
          tab.id === activeTabId ? (
            <div key={tab.id}>
              {tab.type === "graph" ? (
                <GraphView data={graphData} onSelect={(id) => {
                  createNoteFromTitle(id);
                  openTab({ title: id, type: "note", noteId: id });
                }} />
              ) : (
                <NoteView
                  id={tab.noteId}
                  markdown={notes[tab.noteId] ?? ""}
                  onChange={(md) => setNotes({ ...notes, [tab.noteId]: md })}
                />
              )}
            </div>
          ) : null
        )}
        <Toaster />
      </div>
    </div>
  );
}
