import React, { useEffect, useState } from "react";
import { useGroups } from "../../Contexts/GroupContext";
import VoiceSampleDisplay from "./VoiceSample";

export default function GroupSelect({ onSelectionChange }) {
  const BASE_URL = "https://login.memoriatest.kro.kr"; // API 기본 URL
  const { groups, selectedGroupId, setSelectedGroupId, loadGroups } = useGroups();
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const groupList = Object.values(groups);

  useEffect(() => { loadGroups(); }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([]);
      setSelectedMembers([]);
      onSelectionChange?.([]);
      return;
    }
    fetch(`${BASE_URL}/api/groups/members?group_id=${selectedGroupId}`, {
      method: "GET",
      credentials: "include" // 꼭 필요!
    })
      .then(async (res) => {
        const contentType = res.headers.get("Content-Type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`API 응답이 JSON이 아님: ${text}`);
        }
        const data = await res.json();
        if (!data.success || !data.members) throw new Error("멤버 데이터를 가져오지 못했습니다.");
        setMembers(data.members || []);
        setSelectedMembers([]);
        onSelectionChange?.([]);
      })
      .catch((err) => {
        console.error("❌ 멤버 불러오기 실패:", err.message);
        setMembers([]); setSelectedMembers([]);
      });
  }, [selectedGroupId, onSelectionChange]);

  const toggleMember = (subjectId) => {
    const updated = selectedMembers.includes(subjectId)
      ? selectedMembers.filter((id) => id !== subjectId)
      : [...selectedMembers, subjectId];
    setSelectedMembers(updated);
    onSelectionChange?.(updated);
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <label>
          <strong>그룹 선택: </strong>
          <select
            value={selectedGroupId || ""}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">-- 그룹을 선택하세요 --</option>
            {groupList.map((group) => (
              <option key={group.group_id} value={group.group_id}>
                {group.name || group.group_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h4>화자(멤버) 선택</h4>
      {members.length === 0 ? (
        <p>선택한 그룹에 멤버가 없습니다.</p>
      ) : (
        members.map((member) => (
          <div key={member.subject_id}>
            <label>
              <input
                type="checkbox"
                checked={selectedMembers.includes(member.subject_id)}
                onChange={() => toggleMember(member.subject_id)}
              />
              &nbsp;{member.name || member.subject_id}
            </label>
            <VoiceSampleDisplay name={member.name || member.subject_id} sampleUrl={member.VoiceFilePath} />
          </div>
        ))
      )}
    </div>
  );
}
