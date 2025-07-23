/**
 * 이 파일은 서버의 /gemini API 엔드포인트와의 모든 통신을 담당하는 함수들을 모아놓은 모듈입니다.
 * 주로 AiActionsWidget.js에서 사용됩니다.
 */

const SERVER_URL = "https://login.memoriatest.kro.kr";

/**
 * 서버에 텍스트를 보내 번역을 요청합니다.
 * @param {string} title - 번역할 노트의 제목 (선택 사항)
 * @param {string} content - 번역할 노트의 본문 내용
 * @param {string} target_language - 번역 목표 언어 (예: 'English', 'Korean')
 * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
 * @returns {Promise<{translated_content: string, translated_title: string|null}>} 번역된 콘텐츠와 제목을 포함한 객체
 */
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
        return data; // { translated_content, translated_title } 객체 전체를 반환
    } catch (error)
    {
        console.error("❌ 번역 오류:", error);
        throw error;
    }
}

/**
 * AI에게 현재 노트 내용을 바탕으로 질문합니다.
 * @param {string} question - 사용자의 질문
 * @param {string} context - 현재 노트의 내용
 * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
 * @returns {Promise<string>} AI의 답변 텍스트
 */
export async function chatWithAI(question, context, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, context }),
            signal: signal
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
 * 노트 내용을 기반으로 AI에게 제목 추천을 요청합니다.
 * @param {string} content - 제목을 추천받을 노트 내용
 * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
 * @returns {Promise<string[]>} 추천된 제목들의 배열
 */
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

/**
 * 요약문 생성을 위해 먼저 AI에게 텍스트에서 키워드를 추천받습니다.
 * @param {string} content - 키워드를 추출할 원문 텍스트
 * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
 * @returns {Promise<{keywords: string[]}>} 추천된 키워드 배열을 포함한 객체
 */
export async function suggestKeywords(content, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/suggest-keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '키워드 추천 실패');
        }
        return await response.json();
    } catch (error) {
        console.error("❌ 키워드 추천 오류:", error);
        throw error;
    }
}

/**
 * 사용자가 선택한 키워드를 바탕으로 최종 요약문을 생성하도록 요청합니다.
 * @param {string} content - 요약할 원문 텍스트
 * @param {string[]} selectedKeywords - 사용자가 선택한 키워드 배열
 * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
 * @returns {Promise<{summary: string}>} 생성된 요약 마크다운을 포함한 객체
 */
export async function generateSummaryWithKeywords(content, selectedKeywords, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/generate-summary-with-keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, selectedKeywords }),
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '요약 생성 실패');
        }
        return await response.json();
    } catch (error) {
        console.error("❌ 요약 생성 오류:", error);
        throw error;
    }
}

/**
 * [신규 기능] 특정 키워드에 대한 심층 분석을 서버에 요청합니다.
 * @param {string} original_text - 분석의 기반이 될 원문 텍스트 (회의록 등)
 * @param {string} keyword - 심층 분석할 특정 키워드
 * @param {string} language - 텍스트의 언어 (예: 'Korean')
 * @param {string[]|null} speakers - 회의 참석자 목록 (선택 사항)
 * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
 * @returns {Promise<string>} AI가 생성한 키워드 분석 마크다운 내용
 */
export async function analyzeKeywordInContext(original_text, keyword, language, speakers, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/analyze-keyword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ original_text, keyword, language, speakers }),
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '키워드 분석 실패');
        }
        const data = await response.json();
        return data.keyword_content; // 마크다운 텍스트 반환
    } catch (error) {
        console.error(`❌ 키워드 '${keyword}' 분석 오류:`, error);
        throw error;
    }
}