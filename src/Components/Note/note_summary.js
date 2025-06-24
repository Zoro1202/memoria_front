// note_summary.js (React 환경 전용)
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyD5wPXemmyluu3D4_UGmnnkNXUFoB5UvTk");

// [[키워드]] 추출
export function extractKeywords(markdownText) {
  const regex = /\[\[([^\[\]]+?)\]\]/g;
  return [...markdownText.matchAll(regex)].map(match => match[1]);
}

// 부정 문장 강조
export function highlightNegativeSentences(text) {
  const negativeKeywords = [
    "문제", "어렵", "불가능", "실패", "불만", "지연", "손해", "실수", "불편", "부족", "무리", "비효율", "불확실", "혼란",
    "리스크", "위험", "중단", "취소", "부정적", "해결되지", "이슈", "안 됨", "안됨", "안됐다", "불통"
  ];
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.map(sentence => {
    if (negativeKeywords.some(k => sentence.includes(k))) {
      return `<span style="background-color: #ffcccc; color: #990000;">${sentence}</span>`;
    } else return sentence;
  }).join(" ");
}

// 회의 요약
export async function summarizeMeeting(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const dynamicTokens = Math.floor(text.length * 0.5);
  const adjustedMax = Math.max(300, Math.min(1500, dynamicTokens, 700));

  const prompt = `다음 회의록을 중요한 내용 위주로 요약해 주세요. 화자별 발언이 포함되어 있습니다.\n\n${text}`;
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: adjustedMax }
  });

  const summary = result.response.candidates[0].content.parts[0].text;
  const trimmed = summary.length > 4000 ? summary.slice(0, 4000) + "..." : summary;

  return {
    raw: trimmed,
    highlighted: highlightNegativeSentences(trimmed)
  };
}

// 요약 기반 마크다운 생성
export async function generateMarkdown(summaryText) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an AI assistant that extracts key topics and keywords from meeting summaries. ...요약: ${summaryText} 예시: 핵심 키워드: [[친환경 사무실]], [[안성재]], [[신규 사업 전략]] ## 토픽 1: 안성재의 프랜차이즈 사업 - 내용은 여기에`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 1000 }
  });

  const markdown = result.response.candidates[0].content.parts[0].text;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "_").slice(0, 19);

  return `# 회의록 요약 및 키워드 (${timestamp})\n\n## 원문 요약\n${summaryText}\n\n---\n\n## 핵심 키워드 및 토픽\n${markdown}`;
}

// 👉 저장 대신 Context 사용 예시 함수
export function insertSummaryNote({
  currentId,
  markdown,
  notes,
  setNotes,
  openTab,
  setActiveTabId
}) {
  // 제목 중복 방지
  let newId = `요약_${currentId}`;
  let i = 1;
  while (notes.hasOwnProperty(newId)) {
    newId = `요약_${currentId}(${i++})`;
  }

  setNotes(prev => ({ ...prev, [newId]: markdown }));
  openTab({ title: newId, type: "note", noteId: newId });
  setActiveTabId(newId);

  return newId;
}
