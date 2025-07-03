// src/Components/Util/AiActionsWidget.js

import React, { useState } from 'react';
import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from '../../Contexts/TabsContext';
import { toast } from 'react-hot-toast';
import { saveNote } from '../Note/note_summary';
import './AiActionsWidget.css'; 

const ActionIcon = ({ children }) => <span className="action-icon">{children}</span>;

export default function AiActionsWidget({ onClose }) {
  const { activeNoteContent, setNotes, updateNote } = useNotes();
  const { openTab, setActiveTabId, activeTabId, noteIdFromTab } = useTabs();
  
  const [view, setView] = useState('initial'); 
  const [resultData, setResultData] = useState({ title: '', content: '' });
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  const API_BASE_URL = 'http://localhost:8000';

  const handleChatSubmit = async (e) => {
    if (e.key === 'Enter' && chatInput.trim() !== '') {
      e.preventDefault();
      const question = chatInput;
      setChatHistory(prev => [...prev, { type: 'user', text: question }]);
      setChatInput('');
      setView('loading');
      try {
        const response = await fetch(`${API_BASE_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context: activeNoteContent }) });
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || '서버 응답 오류'); }
        const data = await response.json();
        setChatHistory(prev => [...prev, { type: 'ai', text: data.answer }]);
        setView('chat');
      } catch (error) {
        toast.error(`AI 응답 실패: ${error.message}`);
        setChatHistory(prev => prev.slice(0, -1));
        setView('initial');
      }
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeNoteContent || activeNoteContent.trim() === '') { toast.error("요약할 노트 내용이 없습니다."); return; }
    setView('loading');
    try {
      const response = await fetch(`${API_BASE_URL}/generate-summary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: activeNoteContent }) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `서버 오류`); }
      const data = await response.json();
      setResultData(data);
      setView('result');
    } catch (error) { toast.error(`요약 실패: ${error.message}`); setView('initial'); }
  };

  const handleTranslateAndSaveAsNew = async () => {
    if (!activeNoteContent || activeNoteContent.trim() === '') { toast.error("번역할 노트 내용이 없습니다."); return; }
    setView('loading');
    try {
        const response = await fetch(`${API_BASE_URL}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: activeNoteContent }) });
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `서버 오류`); }
        const data = await response.json();
        
        const currentNoteId = noteIdFromTab(activeTabId);
        const newTitle = `${currentNoteId}_EN`;

        toast.loading("번역된 노트를 저장 중...", { id: 'saving-translation' });
        
        const savedData = await saveNote({
            title: newTitle,
            content: data.translated_text,
            owner_id: 'test_user_001',
            group_id: 1
        });

        setNotes(prev => ({ ...prev, [savedData.title]: { content: data.translated_text } }));
        openTab({ title: savedData.title, type: 'note', noteId: savedData.title });
        setActiveTabId(savedData.title);
        
        toast.success(`"${newTitle}"(으)로 저장되었습니다!`, { id: 'saving-translation' });
        onClose();

    } catch (error) { toast.error(`번역 및 저장 실패: ${error.message}`, { id: 'saving-translation' }); setView('initial'); }
  };
  
  const handleApplySummary = () => {
    const currentNoteId = noteIdFromTab(activeTabId);
    if (!currentNoteId) { toast.error("적용할 노트가 없습니다."); return; }
    
    const updatedId = updateNote(currentNoteId, resultData.title, resultData.content);
    
    // 제목이 변경되었을 경우 탭 정보도 업데이트 해야 하지만, 이 로직은 복잡하므로
    // 일단은 내용만 업데이트하는 것으로 사용자가 인지하도록 합니다.
    // 추후 TabsContext에 탭 제목 변경 함수를 추가하면 완벽해집니다.
    
    toast.success("요약 내용이 파일에 적용되었습니다!");
    onClose();
  };
  
  const handleGoBack = () => { setView('initial'); setChatHistory([]); setResultData({ title: '', content: '' }); }

  return (
    <div className="ai-actions-widget">
      <div className="widget-header">
        <h4>AI 도우미</h4>
        <button className="widget-close-button" onClick={onClose}>×</button>
      </div>
      <div className="widget-content-wrapper">
        {view === 'initial' && (
          <div className="widget-view initial-view">
            <textarea className="chat-input" placeholder="문서 내용에 대해 질문해보세요..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatSubmit} rows={3} />
            <button className="action-button" onClick={handleGenerateSummary}><ActionIcon>📄</ActionIcon> 이 페이지 요약하기</button>
            <button className="action-button" onClick={handleTranslateAndSaveAsNew}><ActionIcon>A文</ActionIcon> 번역하여 새 노트로 저장</button>
          </div>
        )}
        {view === 'loading' && ( <div className="widget-view loading-view"><p>AI가 생각 중입니다...</p></div> )}
        {view === 'chat' && (
            <div className="widget-view chat-view">
                <div className="chat-history">{chatHistory.map((msg, index) => ( <div key={index} className={`chat-message ${msg.type}`}><p>{msg.text}</p></div> ))}</div>
                <div className="result-actions"><button onClick={handleGoBack} className="widget-button-secondary">돌아가기</button></div>
            </div>
        )}
        {view === 'result' && (
          <div className="widget-view result-view">
            <pre>{resultData.content}</pre>
            <div className="result-actions">
              <button onClick={handleGoBack} className="widget-button-secondary">취소</button>
              <button onClick={handleApplySummary} className="widget-button-primary">현재 노트에 적용</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}