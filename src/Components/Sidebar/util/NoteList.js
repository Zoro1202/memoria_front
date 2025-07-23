// NoteList.js
import React, { useState, useEffect,useRef } from 'react';
import './GroupList.css';
import {PlusCircle, X, Trash2}from 'lucide-react'
import { useGroups } from '../../../Contexts/GroupContext';
import { toast } from 'react-hot-toast';
import { useTabs } from '../../../Contexts/TabsContext';

const NoteList = ({ onGroupSelect }) => {
  const { groups, loadGroups, loading, createGroup, selectedGroupId, setSelectedGroupId } = useGroups();
  const {closeAllNoteTab} = useTabs();
  const [isOpen, setIsOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const handleGroupSelect = (group) => {
    setSelectedGroupId(group.group_id);
    if (onGroupSelect) {
      onGroupSelect(group);
      //그래프 빼고 탭 삭제해야함
      closeAllNoteTab();
    }
    // toast.success(`그룹 "${group.name}"이 선택되었습니다.`);
  };

  const handleGroupDelete = (group) =>{
    if(selectedGroupId === group){
      
      setSelectedGroupId(groups[selectedGroupId]);
    }
    //현재 선택된 그룹을 삭제 시 열린 탭 삭제해야함
    closeAllNoteTab();
  }

  const confirmCreate = async () => {
    const name = newName.trim();
    if (!name) return toast.error('그룹 이름을 입력하세요');
    try {
      const res = await createGroup(name);
      toast.success(`"${name}" 그룹이 생성되었습니다`);
      setShowAdd(false);
      setNewName('');
      loadGroups();
      setTimeout(() => {
        handleGroupSelect(res);
      }, 1000);
    } catch (e) {
      toast.error(e.message || '그룹 생성 실패');
    }
  };

  /* 키보드 처리 */
  const handleKey = (e) => {
    if (e.key === 'Enter') confirmCreate();
    if (e.key === 'Escape') { setShowAdd(false); setNewName(''); }
  };

  if (loading) {
    return (
      <div className="group-list-loading">
        <div className="spinner"></div>
        <span>그룹 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="group-list-wrapper">
      {/* 헤더 */}
      <div className="groups-header">
        <h3 className="group-title">그룹 목록</h3>
        <button
          className="group-toggle-btn"
          onClick={() => setIsOpen((p) => !p)}
          aria-label={isOpen ? '접기' : '펼치기'}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* 목록 & 추가버튼 */}
      {isOpen && (
        <div className="groups-container">
          <div className="groups-content">
            {/* 기존 그룹 */}
            {Object.values(groups).map((g) => (
              <div className={`group-item ${selectedGroupId === g.group_id ? 'selected' : ''}`}>
                <button
                  key={g.group_id}
                  onClick={() => handleGroupSelect(g)}
                >
                  {g.name}
                </button>
                <button
                  onClick={()=>{}}
                >
                  <Trash2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }}/>
                </button>
              </div>
            ))}

            {/* + 버튼 또는 입력폼 */}
            {!showAdd ? (
              <button className="group-item add-group-btn" onClick={() => setShowAdd(true)}>
                <PlusCircle size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                그룹 생성
              </button>
            ) : (
              <div className="add-group-form">
                <input
                  ref={inputRef}
                  className="add-group-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="새 그룹 이름"
                />
                <button className="add-group-confirm" onClick={confirmCreate}>추가</button>
                <button
                  className="add-group-cancel"
                  onClick={() => { setShowAdd(false); setNewName(''); }}
                >
                  <X size={14} style={{ marginRight: 6, verticalAlign: 'middle' }}/>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteList;
