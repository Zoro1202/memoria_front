// 파일: src/Components/Util/AiHelper.js

import React, { useState } from 'react';
import AiActionsWidget from './AiActionsWidget';
import './AiHelper.css';
import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from '../../Contexts/TabsContext';
import memoriaLogo from './Black_White_Sub_Center.png';

const AiIcon = () => (
    <img 
        src={memoriaLogo} 
        alt="AI 도우미 로고" 
        style={{ width: '32px', height: '32px' }}
    />
);

export default function AiHelper() {
    // [기존] isOpen 상태의 이름을 isWidgetVisible로 변경하여 명확화
    const [isWidgetVisible, setIsWidgetVisible] = useState(false);
    // [추가] AiActionsWidget의 상태를 완전히 초기화하기 위한 key 상태
    const [widgetKey, setWidgetKey] = useState(0);

    const { activeNoteContent } = useNotes();
    const { tabs, activeTabId } = useTabs();
    const isActionable = activeNoteContent && activeNoteContent.trim() !== '';

    const shouldShowHelper = tabs.find(t => t.id === activeTabId && t.type === "note");


    // AI 아이콘을 클릭했을 때 위젯을 여는 함수
    const handleOpenWidget = () => {
        if (isActionable) {
            setIsWidgetVisible(true);
        }
    };

    // [추가] 위젯의 '최소화' 버튼을 눌렀을 때 호출될 함수
    const handleMinimizeWidget = () => {
        setIsWidgetVisible(false);
    };

    // [추가] 위젯의 'X' 닫기 버튼을 눌렀을 때 호출될 함수
    const handleCloseAndResetWidget = () => {
        setIsWidgetVisible(false);
        // key를 변경하여 AiActionsWidget 컴포넌트를 강제 재마운트 -> 모든 상태가 초기화됨
        setWidgetKey(prevKey => prevKey + 1);
    };

    // 현재 활성화된 탭이 'note' 타입일 때만 AI 헬퍼 아이콘을 표시
    

    

    return (
        // ✅ 핵심 수정: 최상위 div에 display 스타일을 동적으로 적용
        <div 
            className="ai-helper-container" 
            style={{ display: shouldShowHelper ? 'block' : 'none' }}
        >
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
                    title={isActionable ? "AI 도우미 열기" : "AI 기능을 사용하려면 노트에 내용이 있어야 합니다"}
                >
                    <AiIcon />
                </button>
            )}
        </div>
    );
}