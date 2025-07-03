import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Network, Group } from 'lucide-react';
import VaultManager from '../../Components/VaultManager/VaultManager';

import './Sidebar.css';

export default function SidebarLayout() {
  // SideBar State 관련.
  const [isOpen, setIsOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const vaultRef = useRef(null);
  const isResizing = useRef(false);

//#region 사이드 바 숨기기 관련 함수들
  const handleMouseDown = () => {
    isResizing.current = true;
  }; 
  const handleMouseMove = (e) => {
    if (isResizing.current && isOpen) {
      const newWidth = e.clientX;
      if (newWidth > 100 && newWidth < 500) {
        setSidebarWidth(newWidth);
      }
    }
  };
  const handleMouseUp = () => {
    isResizing.current = false;
  };
//#endregion

//#region Sidebar의 AddNote 와 GraphView 창 열기 버튼 관련 함수들
  const handleAddNote = useCallback(() => {
    vaultRef.current?.addTab();
  }, []);

  const handleAddGraph = useCallback(() => {
    vaultRef.current?.addGraphTab();
  }, []);
  //#endregion
  
  //DOM
  return (
    <div
      className="container"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        className={`sidebar ${isOpen ? 'open' : 'closed'}`}
        style={{ width: isOpen ? `${sidebarWidth}px` : '56px' }}
      >
        <div className="sidebar-header">
          {isOpen && (
            <img src="/memoria.png" alt="Logo" className="logo" />
          )}
          <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {isOpen && (
          <div className="sidebar-content">
            <button className='note-group-btn' onClick={()=>console.log("GROUP_CLICK")}>
              <Group size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              그룹
            </button>
            <button className="add-note-btn" onClick={handleAddNote}>
              <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              새 노트
            </button>
            <button className="add-note-btn" onClick={handleAddGraph}>
              <Network size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              그래프 보기
            </button>
            
          </div>
        )}

        {isOpen && (
          <div
            className="sidebar-resizer"
            onMouseDown={handleMouseDown}
          />
        )}
      </div>

      <VaultManager ref={vaultRef} />
    </div>
  );
}
