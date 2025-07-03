// src/Components/Note/note_summary.js

const SERVER_URL = "http://127.0.0.1:8000";

/**
 * GET /notes API를 호출하여 DB에 저장된 모든 노트를 가져옵니다.
 */
export async function listAllNotesFromDB() {
  try {
    const response = await fetch(`${SERVER_URL}/notes`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`노트 목록 조회 실패: ${errorData.error || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("❌ 노트 목록 조회 오류:", error);
    // 초기 로딩 시 에러가 발생해도 앱이 멈추지 않도록 빈 배열을 반환합니다.
    return [];
  }
}

/**
 * POST /notes API를 호출하여 단일 노트를 DB에 저장/업데이트합니다.
 * @param {{title: string, content: string, owner_id: string, group_id: number}} noteData 
 */
export async function saveNote(noteData) {
    const { title, content, owner_id, group_id } = noteData;
    try {
        const response = await fetch(`${SERVER_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, owner_id, group_id })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'DB 저장 실패');
        }
        return await response.json();
    } catch (error) {
        console.error("❌ 노트 저장 오류:", error);
        throw error;
    }
}