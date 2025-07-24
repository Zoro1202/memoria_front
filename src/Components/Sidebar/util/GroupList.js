// GroupList.js
import React, { useState, useEffect,useRef } from 'react';
import './GroupList.css';
import {PlusCircle, X, EllipsisVertical }from 'lucide-react'
import { useGroups } from '../../../Contexts/GroupContext';
import { toast } from 'react-hot-toast';
import { useTabs } from '../../../Contexts/TabsContext';
import GroupWindowModal from './GroupProfile'; // 경로에 따라 조정


const GroupList = ({ onGroupSelect }) => {
  const { groups, loadGroups, loading, createGroup, selectedGroupId, setSelectedGroupId } = useGroups();
  const {closeAllNoteTab} = useTabs();
  const [isOpen, setIsOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef(null);
  // const [isGroupOptionsModalOpen, setIsGroupOptionsModalOpen] = useState(false);
  const [pendingGroup, setPendingGroup] = useState(null); // 클릭된 그룹
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); // 모달 표시 여부

  useEffect(() => {
    loadGroups();
  }, [groups, loadGroups]);

  const handleGroupSelect = (group) => {
    setSelectedGroupId(group.group_id);
    if (onGroupSelect) {
      onGroupSelect(group);
      //그래프 빼고 탭 삭제해야함
      closeAllNoteTab();
    }
    // toast.success(`그룹 "${group.name}"이 선택되었습니다.`);
  };

  // const handleGroupDelete = (group) =>{
  //   if(selectedGroupId !== group.group_id){
  //     // setSelectedGroupId(groups[selectedGroupId]);

  //     //** */
  //     // deleteGroup(group.group_id);
  //     // toast.success(`그룹을 삭제했습니다!`);
  //     //** */
      
  //     //현재 선택된 그룹을 삭제 시 열린 탭 삭제해야함
  //     closeAllNoteTab();
  //   } else {
  //     toast.error(`그룹이 열려 있습니다!`);
  //   }
  // }
  
  // const confirmDelete = () => {
  //   if (pendingDeleteId === null) return;

  //   deleteGroup(pendingDeleteId);
  //   toast.success(`그룹을 삭제했습니다!`);

  //   setPendingDeleteId(null);
  //   setIsDeleteModalOpen(false);
  // };

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
        <h3 className="group-title">
          
          그룹 목록
          </h3>
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
            {isGroupModalOpen && pendingGroup && (
              <GroupWindowModal
                isOpen={isGroupModalOpen} // 이 부분을 추가해야 합니다!
                group={pendingGroup}
                onClose={() => setIsGroupModalOpen(false)}
              />
            )}
            {Object.values(groups).map((g, index) => (
              <div 
                key={index}
                className={`group-item ${selectedGroupId === g.group_id ? 'selected' : ''}`}
                onClick={() => handleGroupSelect(g)}>
                <button
                  className={`group-item-sel ${selectedGroupId === g.group_id ? 'selected' : ''}`}
                  key={g.group_id}
                >
                  {g.name}
                </button>
                <button
                  className={`group-item-del ${selectedGroupId === g.group_id ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingGroup(g); // 선택된 그룹 설정
                    setIsGroupModalOpen(true); // 모달 열기
                  }}
                >
                  <EllipsisVertical size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
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

export default GroupList;