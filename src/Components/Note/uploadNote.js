import { saveNote } from "./RestAPI_Port";

async function handleSave() {
  try {
    const data = await saveNote({
      title: "내 노트 제목",
      content: "여기에 노트 원문",
      owner_id: "test-user",
      group_id: 1,
    });
    alert("저장 완료! 새 제목: " + data.title);
    // 👉 Graph 갱신 필요하면 여기서 getNotes() 호출
  } catch (err) {
    alert(err.message);
  }
}

import { getNoteDetail } from "./RestAPI_Port";

async function handleNodeClick(noteId) {
  const data = await getNoteDetail(noteId);
  console.log("노트 상세:", data);
  // 👉 에디터에 data.title, data.content 반영
}

import { getNotes } from "./RestAPI_Port";

async function loadGraph() {
  const notes = await getNotes();
  // 👉 그래프 라이브러리에 notes 전달해서 노드 생성
}
