// src/Components/Util/AiHelper.js (전체 코드)

import React, { useState } from 'react';
import AiActionsWidget from './AiActionsWidget';
import './AiHelper.css';
import { useNotes } from '../../Contexts/NotesContext';

const AiIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M6.3033 8.1967C6.6929 7.8071 7.3171 7.8071 7.7067 8.1967L12 12.49L16.2933 8.1967C16.6829 7.8071 17.3071 7.8071 17.6967 8.1967C18.0863 8.5863 18.0863 9.2105 17.6967 9.59999L13.4034 13.8933C12.6224 14.6743 11.3776 14.6743 10.5966 13.8933L6.3033 9.59999C5.9137 9.2105 5.9137 8.5863 6.3033 8.1967Z" transform="rotate(45 12 12)" fill="currentColor"/>
    </svg>
);

export default function AiHelper() {
    const [isOpen, setIsOpen] = useState(false);
    const { activeNoteContent } = useNotes();

    // ✅ [진단용 로그] AiHelper가 인식하는 activeNoteContent 값을 확인합니다.
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