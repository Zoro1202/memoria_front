// src/Components/Util/AiHelper.js (전체 코드)

import React, { useState } from 'react';
import AiActionsWidget from './AiActionsWidget';
import './AiHelper.css';
import { useNotes } from '../../Contexts/NotesContext';
import memoriaLogo from './Memoria_Icon2.png';

const AiIcon = () => (
    // img 태그를 사용하여 로고 이미지를 표시합니다.
    <img 
        src={memoriaLogo} 
        alt="AI 도우미 로고" 
        style={{ width: '32px', height: '32px' }} // 아이콘 크기 조절
    />
);


export default function AiHelper() {
    const [isOpen, setIsOpen] = useState(false);
    const { activeNoteContent } = useNotes();

    console.log('[AiHelper] Received activeNoteContent:', activeNoteContent);

    const isActionable = activeNoteContent && activeNoteContent.trim() !== '';

    const handleOpen = () => {
        if (isActionable) {
            setIsOpen(true);
        }
    };

    if (isOpen) {
        return (
            <div className="ai-helper-container">
                <AiActionsWidget onClose={() => setIsOpen(false)} />
            </div>
        );
    }
    
    return (
        <div className="ai-helper-container">
            <button
                className="ai-trigger-button"
                onClick={handleOpen}
                disabled={!isActionable}
                title={isActionable ? "AI 도우미 열기" : "AI 기능을 사용하려면 노트 탭을 선택하세요"}
            >
                <AiIcon />
            </button>
        </div>
    );
}