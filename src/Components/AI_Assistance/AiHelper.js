// 파일: src/Components/Util/AiHelper.js
import { useCallback, useEffect } from 'react';
import React, { useState } from 'react';
import AiActionsWidget from './AiActionsWidget';
import './AiHelper.css';
import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from '../../Contexts/TabsContext';
import memoriaLogo from './Black_Widget.png';
//import { useGroups } from '../../Contexts/GroupContext';
const AiIcon = () => (
    <img 
        src={memoriaLogo} 
        alt="AI 도우미 로고" 
        style={{ width: '32px', height: '32px' }}
    />
);

export default function AiHelper() {
    const [isWidgetVisible, setIsWidgetVisible] = useState(false);
    const [widgetKey, setWidgetKey] = useState(0);

    const { notes } = useNotes();
    const { tabs, activeTabId } = useTabs();

    const activeTab = tabs.find(t => t.id === activeTabId);
    const isNoteActive = activeTab && activeTab.type === "note";
    
    const currentNoteContent = isNoteActive ? (notes[activeTab.title]?.content || '') : '';
    
    const hasContent = currentNoteContent.trim() !== '';
    const isActionable = isNoteActive && hasContent;

    const handleOpenWidget = useCallback(() => {
        if (isActionable) {
            setIsWidgetVisible(true);
        }
    }, [isActionable]);

    const handleMinimizeWidget = () => {
        setIsWidgetVisible(false);
    };

    const handleCloseAndResetWidget = () => {
        setIsWidgetVisible(false);
        setWidgetKey(prevKey => prevKey + 1);
    };

    return (
        <div className={`ai-helper-container ${isNoteActive ? 'visible' : ''}`}>
            <AiActionsWidget
                key={widgetKey}
                onClose={handleCloseAndResetWidget}
                onMinimize={handleMinimizeWidget}
                isVisible={isWidgetVisible}
            />
            
            {!isWidgetVisible && (
                <button
                    className="ai-trigger-button"
                    onClick={handleOpenWidget}
                    disabled={!isActionable}
                    title={
                        isNoteActive 
                            ? (hasContent ? "AI 도우미 열기" : "AI 기능을 사용하려면 노트에 내용이 있어야 합니다")
                            : "노트 탭에서만 AI 도우미를 사용할 수 있습니다"
                    }
                >
                    <AiIcon />
                </button>
            )}
        </div>
    );
}