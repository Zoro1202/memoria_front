// 파일: src/Components/Note/note_summary.js

/**
 * 이 파일은 서버 API와의 모든 통신을 담당하는 함수들을 모아놓은 모듈입니다.
 * text_Ser.py 서버 파일에 정의된 엔드포인트만을 기준으로 작성되었습니다.
 */

const SERVER_URL = "https://login.memoriatest.kro.kr";

// ==========================================================
// 노트 관리 API (VaultApp.js 등에서 사용)
// ==========================================================


// ==========================================================
// AI 관련 API (AiActionsWidget.js에서 사용)
// ==========================================================

export async function generateSummary(content, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/generate-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '요약 실패');
        }
        return await response.json();
    } catch (error) {
        console.error("❌ 요약 오류:", error);
        throw error;
    }
}

export async function translateText(title, content, target_language, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, target_language }),
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '번역 실패');
        }
        const data = await response.json();
        return data; // 객체 전체를 반환
    } catch (error)
    {
        console.error("❌ 번역 오류:", error);
        throw error;
    }
}

export async function chatWithAI(question, context) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/chat`, {
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

export async function generateTitleFromContent(content, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/generate-title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
            signal: signal,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI 제목 생성 실패');
        }
        const data = await response.json();
        return data.titles;
    } catch (error) {
        console.error("❌ AI 제목 생성 오류:", error);
        throw error;
    }
}