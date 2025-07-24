// GroupProfile.js
import React, { useState } from 'react';
import './GroupProfile.css';
import { X } from 'lucide-react';

const GroupWindowModal = ({ onClose, group, onSave }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [groupName, setGroupName] = useState(group?.name || '');
  const [groupIntro, setGroupIntro] = useState(group?.group_intro || '');

  return (
    <div className="modal-overlay">
      <div className="modal-window">
        {/* 닫기 버튼 */}
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {/* 상단 탭 */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            그룹 정보
          </button>
          <button
            className={`modal-tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            계정
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="modal-content">
          {activeTab === 'info' && (
            <div className="modal-tab-content"> {/* 이 div의 CSS를 수정했습니다. */}
              <div className="form-group"> {/* 그룹 이름 필드를 form-group으로 감쌉니다. */}
                <label htmlFor="group-name">그룹 이름</label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div className="form-group"> {/* 그룹 소개 필드를 form-group으로 감쌉니다. */}
                <label htmlFor="group-intro">그룹 소개</label>
                <textarea
                  id="group-intro"
                  rows="4"
                  value={groupIntro}
                  onChange={(e) => setGroupIntro(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="modal-tab-content">
              {/* ... (기존 멤버 목록 및 초대 섹션 유지) ... */}
            </div>
          )}
        </div>

        {/* 저장 버튼 */}
        <div className="modal-actions">
          <button className="save-btn" onClick={onSave}>저장</button>
        </div>
      </div>
    </div>
  );
};

export default GroupWindowModal;