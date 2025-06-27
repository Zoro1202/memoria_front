// note_summary.js
const SERVER_URL = "http://127.0.0.1:8000"; // ← 여기를 실제 서버 IP로 바꿔줘

/**
 * 서버에 회의록 텍스트를 보내 요약 및 키워드를 받아오는 함수
 * @param {string} text - 회의록 전체 텍스트
 * @returns {Promise<{ markdown: string, summary: string, keywords: string[], filename: string, raw: string }>}
 */
export async function summarizeMeeting(text) {
  try {
    const response = await fetch(`${SERVER_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }

    const data = await response.json();
    return {
      ...data,
      raw: text
    };
  } catch (error) {
    console.error("요약 API 호출 오류:", error);
    return { error: error.message };
  }
}

/**
 * 서버에 저장된 마크다운 파일을 다운로드하는 함수
 * @param {string} filename - 서버에 저장된 파일 이름
 */
export function downloadMarkdownFile(filename) {
  const link = document.createElement("a");
  link.href = `${SERVER_URL}/download?filename=${encodeURIComponent(filename)}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 서버 응답 객체에서 마크다운 텍스트만 추출
 * @param {{ markdown: string }} summaryObj
 * @returns {string}
 */
export function generateMarkdown(summaryObj) {
  return summaryObj.markdown || "";
}

/**
 * 마크다운 텍스트에서 [[키워드]] 형식으로 된 키워드만 배열로 추출
 * @param {string} markdownText
 * @returns {string[]} 키워드 배열
 */
export function extractKeywords(markdownText) {
  const regex = /\[\[([^\[\]]+?)\]\]/g;
  const keywords = [];
  let match;
  while ((match = regex.exec(markdownText)) !== null) {
    keywords.push(match[1]);
  }
  return keywords;
}

/**
 * 생성된 요약 마크다운을 새 노트로 삽입하고 탭 열기
 * @param {object} param0
 * @returns {string} 새 노트 ID
 */
export function insertSummaryNote({ currentId, markdown, notes, setNotes, openTab, setActiveTabId }) {
  const newId = `${currentId}_요약`;
  setNotes({
    ...notes, // 스프레드 연산자 : 기존 notes에 있는 데이터를 다 가져오기
    [newId]: markdown // 여기다 새로운 데이터 추가
  });
  openTab({ title: newId, type: "note", noteId: newId });
  setActiveTabId(newId);
  return newId;
}
