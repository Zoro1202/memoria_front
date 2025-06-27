const SERVER_URL = "http://127.0.0.1:8000"; // Flask 서버 주소

export async function saveNoteToServer(title, content, owner_id = "", provider = "") {
  const res = await fetch(`${SERVER_URL}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, owner_id, provider }),
  });
  if (!res.ok) {
    throw new Error("노트 저장 실패");
  }
  return await res.json();
}


async function onSaveNote() {
  try {
    const currentTitle = "노트 제목";  // 현재 노트 제목 가져오기
    const currentContent = "노트 내용";  // 현재 노트 마크다운 내용 가져오기

    const result = await saveNoteToServer(currentTitle, currentContent, "user123", "myapp");
    alert("저장 성공! 노트 ID: " + result.note_id);
  } catch (err) {
    alert("저장 실패: " + err.message);
  }
}

export async function fetchNotes() {
  const res = await fetch(`${SERVER_URL}/notes`);
  if (!res.ok) throw new Error("노트 불러오기 실패");
  return await res.json();
}

// React 컴포넌트 마운트 시 호출해서 notes Context 초기값으로 세팅
