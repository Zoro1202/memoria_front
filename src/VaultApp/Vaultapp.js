import React from "react";
import GraphView from "../Components/Graph/Graph";
import NoteView from "../Components/Note/Note";
import { useNotes } from "../Contexts/NotesContext"; // notes Context
import { useTabs } from "../Contexts/TabsContext";
import { toast, Toaster} from 'react-hot-toast';
import {
  summarizeMeeting,
  generateMarkdown,
  extractKeywords,
  insertSummaryNote
} from "../Components/Note/note_summary";


export default function VaultApp() {
  //노트 정보들 담고있는 context
  const { notes, setNotes, graphData, createNoteFromTitle } = useNotes();
  //탭 정보를 담는 context
  const { tabs, activeTabId, setActiveTabId, openTab, closeTab, noteIdFromTab } = useTabs();

  const createNote = () => {
    const newId = '새 노트' + (Object.keys(notes).length + 1);
    const newContent = "# "+newId+"\n**새 노트!**";
    setNotes({
      ...notes, // 스프레드 연산자 : 기존에 있던거도 추가하기. 이거 없으면 싹 없어짐
      [newId]: newContent, 
    });
    return newId;
  };
  
  const deleteNote = (tid) => {
    const newNotes = { ...notes };
    toast.success(`"${noteIdFromTab(tid)}" 노트가 삭제되었습니다.`);
    delete newNotes[noteIdFromTab(tid)]; // 해당 키 제거
    setNotes(newNotes);
    closeTab(tid);
  };

  return (
    <div className="vault-container">
      {/* 사이드 툴바 */}
      <aside className="toolbar">
        <button onClick={() => openTab({ title: "Graph", type: "graph" })}>🕸️</button>
        <button onClick={() => {const tid = createNote();openTab({ title: tid, type: "note", noteId: tid })}}>+📝</button>
        <button className="btn-del" onClick={()=> deleteNote(activeTabId)}>🗑️</button>
        <button
          onClick={async () => {
            try {
              const currentNoteId = noteIdFromTab(activeTabId);
              const currentNoteContent = notes[currentNoteId];
              if (!currentNoteContent) throw new Error("노트 내용 없음");

              const summaryObj = await summarizeMeeting(currentNoteContent);
              const markdown = await generateMarkdown(summaryObj.raw);

              const newId = insertSummaryNote({
                currentId: currentNoteId,
                markdown,
                notes,
                setNotes,
                openTab,
                setActiveTabId
              });

              toast.success(`요약 탭 생성 완료: ${newId}`);
            } catch (err) {
              toast.error("요약 실패: " + err.message);
            }
          }}
        >📤</button>
      </aside>

      {/* 탭 목록 */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div onClick={()=>setActiveTabId(tab.id)} key={tab.id} className={`tab ${tab.id === activeTabId ? "active" : ""}`}>
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
              {tab.type === "graph" ? ( // 탭 타입이 graph면 GraphView
                <GraphView data={graphData} onSelect={(id) =>{ 
                  createNoteFromTitle(id);// 그래프 뷰에서 클릭한 노트가 content에서 첫 줄이 # 제목이 아니면 자동으로 붙이기
                  openTab({ title: id, type: "note", noteId: id }); // 노트 탭 열기
                }}/>
              ) : (
                <NoteView // 탭 타입이 graphView가 아니면 NoteView
                  id={tab.noteId}
                  markdown={notes[tab.noteId] ?? ""}
                  onChange={(md) => setNotes({ ...notes, [tab.noteId]: md })} // 바로 저장
                  // onChange={()=>{}} // ctrl + s 눌러야만 저장
                />
              )}
            </div>
          ) : null
        )}
        <Toaster/>
      </div>
    </div>
  );
}
