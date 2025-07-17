import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGroups } from '../../Contexts/GroupContext'; // GroupContext 경로 맞게 수정
import VoiceSampleDisplay from './VoiceSample';

export default function MemberSelect({ onSelectionChange }) {
  const { selectedGroupId } = useGroups();

  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([]);
      setSelectedMembers([]);
      if (onSelectionChange) onSelectionChange([]);
      return;
    }

    axios.get(`/api/groups/${selectedGroupId}/members`)
      .then(res => {
        setMembers(res.data.members || []);
        setSelectedMembers([]);
        if (onSelectionChange) onSelectionChange([]);
      })
      .catch(err => {
        console.error('그룹 멤버 로드 실패:', err);
        setMembers([]);
      });
  }, [selectedGroupId, onSelectionChange]);

  const toggleMember = (subjectId) => {
    let updated = [];
    if (selectedMembers.includes(subjectId)) {
      updated = selectedMembers.filter(id => id !== subjectId);
    } else {
      updated = [...selectedMembers, subjectId];
    }
    setSelectedMembers(updated);
    if (onSelectionChange) onSelectionChange(updated);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h4>👥 화자 선택 (그룹 멤버)</h4>
      {!selectedGroupId && <p>먼저 그룹을 선택해주세요.</p>}
      {selectedGroupId && members.length === 0 && <p>해당 그룹에 멤버가 없습니다.</p>}
      {members.map(member => (
        <div key={member.subject_id} style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={selectedMembers.includes(member.subject_id)}
              onChange={() => toggleMember(member.subject_id)}
            />
            <span style={{ marginLeft: 8 }}>{member.nickname || member.name}</span>
          </label>
          <VoiceSampleDisplay
            nickname={member.nickname || member.name}
            sampleUrl={member.sample_file_path || member.VoiceFilePath}
          />
        </div>
      ))}
    </div>
  );
}
