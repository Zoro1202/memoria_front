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
        const linkMap = {};
        let linkIndex = 0;

        // [[...]] 링크를 placeholder로 교체
        const contentWithPlaceholders = (content || '').replace(/(\[\[[^\]]+\]\])/g, (match) => {
            const placeholder = `__MEMORIA_LINK_${linkIndex}__`;
            linkMap[placeholder] = match;
            linkIndex++;
            return placeholder;
        });

        const response = await fetch(`${SERVER_URL}/gemini/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content: contentWithPlaceholders, target_language }),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '번역 실패');
        }

        const data = await response.json();

        // placeholder를 다시 원래 링크로 복원
        let finalContent = data.translated_content;
        for (const placeholder in linkMap) {
            finalContent = finalContent.replace(placeholder, linkMap[placeholder]);
        }

        return { ...data, translated_content: finalContent };

    } catch (error)
    {
        console.error("❌ 번역 오류:", error);
        throw error;
    }
}

// /**
//  * AI에게 현재 노트 내용을 바탕으로 질문합니다.
//  * @param {string} question - 사용자의 질문
//  * @param {string} context - 현재 노트의 내용
//  * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
//  * @returns {Promise<string>} AI의 답변 텍스트
//  */
// export async function chatWithAI(question, context, signal) {
//     try {
//         const response = await fetch(`${SERVER_URL}/gemini/chat`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ question, context }),
//             signal: signal
//         });
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || 'AI 채팅 실패');
//         }
//         const data = await response.json();
//         return data.answer;
//     } catch (error) {
//         console.error("❌ AI 채팅 오류:", error);
//         throw error;
//     }
// }

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
export async function generateSummaryWithKeywords(content, selectedKeywords, language, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/generate-summary-with-keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, selectedKeywords, language }), // language 추가
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
export async function analyzeKeywordInContext(original_text, keyword, language, speakers, signal, sourceNoteTitle) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/analyze-keyword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ original_text, keyword, language, speakers, source_note_title: sourceNoteTitle }),
            signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        const data = await response.json();
        return data.keyword_content;
    } catch (error) {
        console.error('Error analyzing keyword:', error);
        throw error;
    }
};

// [신규] 사용자의 모든 채팅 세션 목록을 불러옵니다.
export async function loadAllChatSessions(subjectId, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/chat/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId: String(subjectId) }),
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '채팅 세션 목록 로딩 실패');
        }
        const data = await response.json();
        return data.sessions; // { sessions: [...] } 형태의 응답에서 sessions 배열 반환
    } catch (error) {
        console.error("❌ 채팅 세션 목록 로딩 오류:", error);
        throw error;
    }
}

// [신규] 특정 노트/그룹에 대한 채팅 기록을 불러옵니다.
export async function loadChatHistory(noteId, groupId, subjectId, signal) { // subjectId 추가
    try {
        const response = await fetch(`${SERVER_URL}/gemini/chat/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                noteId: String(noteId), 
                groupId: String(groupId), 
                subjectId: String(subjectId) 
            }), // 모든 ID를 문자열로 변환
            signal: signal,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '채팅 기록 로딩 실패');
        }
        const data = await response.json();
        console.log("Data received from /gemini/chat/history:", data);
        return data; // { messages: [...], session_id: ... } 객체 반환
    } catch (error) {
        console.error("❌ 채팅 기록 로딩 오류:", error);
        throw error;
    }
}

// [신규] 특정 채팅 세션을 삭제합니다.
export async function deleteChatSession(sessionId, subjectId, signal) { // subjectId 추가
    try {
        const response = await fetch(`${SERVER_URL}/gemini/chat/session/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId: String(subjectId) }), // subjectId 전송
            signal: signal,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '채팅 세션 삭제 실패');
        }
        return await response.json(); // { success: true, ... } 객체 반환
    } catch (error) {
        console.error("❌ 채팅 세션 삭제 오류:", error);
        throw error;
    }
}

/**
 * AI에게 현재 노트 내용을 바탕으로 질문합니다.
 * @param {string} question - 사용자의 질문
 * @param {string} context - 현재 노트의 내용
 * @param {string} noteId - 현재 노트의 ID
 * @param {string} groupId - 현재 그룹의 ID
 * @param {string} subjectId - 현재 사용자의 ID
 * @param {AbortSignal} signal - 요청 중단을 위한 AbortSignal
 * @returns {Promise<{session_id: number, answer: string}>} AI의 답변과 세션 ID를 포함한 객체
 */
// [수정] 함수 시그니처와 body 내용 변경
export async function chatWithAI(question, context, noteId, groupId, subjectId, signal) {
    try {
        const response = await fetch(`${SERVER_URL}/gemini/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // [수정] 백엔드가 요구하는 모든 정보를 전송
            body: JSON.stringify({ question, context, noteId, groupId, subjectId: String(subjectId) }),
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI 채팅 실패');
        }
        const data = await response.json();
        return data; // { session_id, answer } 객체 전체를 반환
    } catch (error) {
        console.error("❌ AI 채팅 오류:", error);
        throw error;
    }
}

export async function generateContextualSummary(primary_text, reference_texts, selectedKeywords, language, signal, referenceNoteTitles) { // referenceNoteTitles 추가
    try {
        const response = await fetch(`${SERVER_URL}/gemini/generate-contextual-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ primary_text, reference_texts, selectedKeywords, language, referenceNoteTitles }), // referenceNoteTitles 전달
            signal: signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '맥락 요약 생성 실패');
        }
        return await response.json();
    } catch (error) {
        console.error("❌ 맥락 요약 생성 오류:", error);
        throw error;
    }
}

/**
 * [신규] 음성 샘플과 원본 대본을 서버로 보내 정확도 검증을 요청합니다.
 * @param {File|Blob} audioFile - 검증할 음성 파일 (녹음된 blob 또는 선택된 파일)
 * @param {string} originalScript - 비교의 기준이 될 원본 대본 텍스트
 * @param {AbortSignal} [signal] - 요청 중단을 위한 AbortSignal (선택 사항)
 * @returns {Promise<{score: number, transcribedText: string}>} 검증 결과 (정확도 점수, 변환된 텍스트)
 */
export async function verifyVoiceSample(audioFile, originalScript, signal) {
    try {
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('script', originalScript);

        const response = await fetch(`${SERVER_URL}/gemini/verify-voice-sample`, {
            method: 'POST',
            body: formData, // FormData는 Content-Type을 자동으로 설정합니다.
            signal: signal,
            // credentials: 'include' // 필요 시 인증 정보 포함
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '음성 샘플 검증에 실패했습니다.');
        }

        return await response.json(); // { score, transcribedText } 반환
    } catch (error) {
        console.error("❌ 음성 샘플 검증 오류:", error);
        throw error;
    }
}