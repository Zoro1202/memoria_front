import React, { useEffect, useState } from "react";
import { useGroups } from "../../Contexts/GroupContext";
import VoiceSampleDisplay from "./VoiceSample";
import "./css/GroupSelect.css";

export default function GroupSelect({ onSelectionChange }) {
  const BASE_URL = "https://login.memoriatest.kro.kr";
  const { groups, selectedGroupId, setSelectedGroupId, loadGroups } = useGroups();
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const groupList = Object.values(groups);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([]);
      setSelectedMembers([]);
      onSelectionChange?.([]);
      return;
    }
    fetch(`${BASE_URL}/api/groups/members?group_id=${selectedGroupId}`, {
      method: "GET",
      credentials: "include"
    })
      .then(async (res) => {
        const contentType = res.headers.get("Content-Type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("API 응답이 JSON이 아님");
        }
        const data = await res.json();
        if (!data.success || !data.members) throw new Error("멤버 데이터를 가져오지 못했습니다.");
        setMembers(data.members || []);
        setSelectedMembers([]);
        onSelectionChange?.([]);
      })
      .catch(() => {
        setMembers([]);
        setSelectedMembers([]);
      });
  }, [selectedGroupId, onSelectionChange]);

  // 음성샘플이 있는 멤버 subject_id 배열
  const selectableIds = members.filter(m => !!m.VoiceFilePath).map(m => m.subject_id);

  // 전체선택 체크박스 상태
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedMembers.includes(id));

  // 전체선택 핸들러
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // 음성샘플 있는 멤버 모두 선택
      const newSelected = [...selectableIds];
      setSelectedMembers(newSelected);
      const infos = members.filter(m => newSelected.includes(m.subject_id)).map(m => ({ subject_id: m.subject_id, name: m.name }));
      onSelectionChange?.(infos);
    } else {
      // 전체 해제
      setSelectedMembers([]);
      onSelectionChange?.([]);
    }
  };

  // 멤버 개별 선택/해제
  const toggleMember = (subjectId) => {
    const updated = selectedMembers.includes(subjectId)
      ? selectedMembers.filter(id => id !== subjectId)
      : [...selectedMembers, subjectId];
    setSelectedMembers(updated);
    const infos = members.filter(m => updated.includes(m.subject_id)).map(m => ({ subject_id: m.subject_id, name: m.name }));
    onSelectionChange?.(infos);
  };

  return (
    <div className="group-select-container">
      <div className="group-dropdown">
        <strong>그룹 선택: </strong>
        <select
          value={selectedGroupId || ""}
          onChange={e => setSelectedGroupId(e.target.value)}
        >
          <option value="">-- 그룹을 선택하세요 --</option>
          {groupList.map(group => (
            <option key={group.group_id} value={group.group_id}>
              {group.name || group.group_name}
            </option>
          ))}
        </select>
      </div>

      <div className="member-list-label">화자(멤버) 선택</div>

      {members.length === 0 ? (
        <p>선택한 그룹에 멤버가 없습니다.</p>
      ) : (
        <>
          <div className="member-checkbox-row select-all-row">
            <label>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                disabled={selectableIds.length === 0}
              />
              &nbsp;전체선택
            </label>
          </div>

          {members.map(member => {
            const hasSample = !!member.VoiceFilePath;
            return (
              <div key={member.subject_id} className="member-checkbox-row" style={{ opacity: hasSample ? 1 : 0.5 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.subject_id)}
                    disabled={!hasSample}
                    onChange={() => toggleMember(member.subject_id)}
                  />
                  &nbsp;{member.name || member.subject_id}
                  {!hasSample && <span className="no-sample-msg"> (음성 샘플을 등록해 주세요)</span>}
                </label>
                <VoiceSampleDisplay name={member.name || member.subject_id} sampleUrl={member.VoiceFilePath} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
