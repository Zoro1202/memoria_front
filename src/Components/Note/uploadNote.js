// src/utils/uploadNotes.js

export async function uploadSingleNote(noteId, content) {
  if (!noteId) throw new Error("노트 ID가 없습니다.");
  if (!content) throw new Error("노트 내용이 없습니다.");

  const blob = new Blob([`# ${noteId}\n\n${content}`], {
    type: "text/plain",
  });

  const file = new File([blob], `${noteId}.txt`, {
    type: "text/plain",
  });

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://127.0.0.1:8000/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("서버 전송 실패");
  return await res.json();
}
