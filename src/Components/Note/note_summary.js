// src/Components/Note/note_summary.js

/**
 * 이 파일은 서버 API와의 모든 통신을 담당하는 함수들을 모아놓은 모듈입니다.
 * text_Ser.py 서버 파일에 정의된 엔드포인트만을 기준으로 작성되었습니다.
 */

// 서버 주소 (서버 실행 시 0.0.0.0:8000 이므로 클라이언트는 localhost 또는 127.0.0.1로 접근)
const SERVER_URL = "http://localhost:8000";

// ==========================================================
// 노트 관리 API (VaultApp.js 등에서 사용)
// ==========================================================

/**
 * GET /notes API를 호출하여 DB에 저장된 모든 노트를 가져옵니다.
 * VaultApp.js에서 앱 로딩 시 사용됩니다.
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
 * POST /notes API를 호출하여 제목이 지정된 노트를 DB에 저장/업데이트합니다.
 * (현재 코드에서는 직접 사용되지 않지만, 수동 저장을 위해 남겨둡니다)
 * @param {{title: string, content: string, subject_id?: string, group_id?: number}} noteData 
 */
export async function saveNote(noteData) {
    const { title, content, subject_id = 'default_user', group_id = 1 } = noteData;
    try {
        const response = await fetch(`${SERVER_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, subject_id, group_id })
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

/**
 * POST /notes/intelligent-save API를 호출하여 AI가 제목을 생성하고 노트를 저장합니다.
 * VaultApp.js의 '🚀' 버튼 클릭 시 사용됩니다.
 * @param {{content: string, subject_id?: string, group_id?: number}} noteData
 */
export async function intelligentSaveNote(noteData) {
    const { content, subject_id = 'default_user', group_id = 1 } = noteData;
    try {
      const response = await fetch(`${SERVER_URL}/notes/intelligent-save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, subject_id, group_id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "지능형 저장 실패");
      }
      return await response.json();
    } catch (error) {
      console.error("❌ 지능형 저장 오류:", error);
      throw error; // 오류를 상위로 전파하여 VaultApp의 toast에서 처리
    }
};

// ==========================================================
// AI 관련 API (AiActionsWidget.js에서 사용)
// ==========================================================

/**
 * POST /generate-summary API를 호출하여 노트 내용을 요약합니다.
 * @param {string} content
 */
export async function generateSummary(content) {
    try {
        const response = await fetch(`${SERVER_URL}/generate-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '요약 실패');
        }
        return await response.json(); // 서버에서 title과 content를 모두 반환
    } catch (error) {
        console.error("❌ 요약 오류:", error);
        throw error;
    }
}

// ✅ [수정] translateText 함수 전체를 아래 코드로 교체해주세요.
/**
 * POST /translate API를 호출하여 제목과 텍스트를 번역합니다.
 * @param {string | null} title - 번역할 노트 제목
 * @param {string} content - 번역할 노트 내용
 * @param {string} target_language - 번역할 언어
 * @returns {Promise<{translated_title: string, translated_content: string}>} 번역된 제목과 내용이 담긴 객체
 */
export async function translateText(title, content, target_language) {
    try {
        const response = await fetch(`${SERVER_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, target_language }) // 제목도 함께 전송
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '번역 실패');
        }
        // 서버에서 받은 번역 객체 전체를 반환합니다.
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("❌ 번역 오류:", error);
        throw error;
    }
}

/**
 * POST /chat API를 호출하여 AI와 대화합니다.
 * @param {string} question
 * @param {string} context
 */
export async function chatWithAI(question, context) {
    try {
        const response = await fetch(`${SERVER_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, context })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI 채팅 실패');
        }
        const data = await response.json();
        return data.answer;
    } catch (error) {
        console.error("❌ AI 채팅 오류:", error);
        throw error;
    }
}

/**
 * DELETE /notes/{noteId} API를 호출하여 기존 노트를 DB에서 삭제합니다.
 * @param {number} noteId - DB의 고유 ID
 */
export async function deleteNoteFromDB(noteId) {
    try {
        const response = await fetch(`${SERVER_URL}/notes/${noteId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'DB 삭제 실패');
        }
        return await response.json();
    } catch (error) {
        console.error("❌ 노트 삭제 오류:", error);
        throw error;
    }
}

/**
 * POST /generate-title API를 호출하여 내용 기반으로 AI 제목들을 생성합니다.
 * @param {string} content
 * @param {AbortSignal} [signal] - 요청을 중단하기 위한 AbortSignal (선택 사항)
 * @returns {Promise<string[]>} 추천 제목들의 배열을 반환합니다.
 */
// ✅ [수정] generateTitleFromContent 함수 시그니처와 fetch 옵션을 변경합니다.
export async function generateTitleFromContent(content, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/generate-title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
            signal: signal, // AbortController의 signal을 전달
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI 제목 생성 실패');
        }
        const data = await response.json();
        return data.titles; 
    } catch (error) {
        console.error("❌ AI 제목 생성 오류:", error);
        throw error; // 에러를 상위로 전파하여 컴포넌트에서 처리
    }
}