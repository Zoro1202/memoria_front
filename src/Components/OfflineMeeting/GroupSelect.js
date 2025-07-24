import React, { useEffect, useState } from "react";
import { useGroups } from "../../Contexts/GroupContext";
import VoiceSampleDisplay from "./VoiceSample";

export default function GroupSelect({ onSelectionChange }) {
  const { groups, selectedGroupId, setSelectedGroupId, loadGroups } = useGroups();
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const groupList = Object.values(groups);

  // ✅ 그룹 목록 초기 로딩
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // ✅ 그룹 선택 시 멤버 목록 fetch
  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([]);
      setSelectedMembers([]);
      onSelectionChange?.([]);
      return;
    }

    fetch(`/api/groups/${selectedGroupId}/members`, {
      method: "GET",
      credentials: "include", // ✅ 쿠키 기반 인증을 위한 옵션
    })
      .then(async (res) => {
        const contentType = res.headers.get("Content-Type") || "";

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`API 응답이 JSON이 아님: ${text}`);
        }

        const data = await res.json();

        if (!data.success || !data.members) {
          throw new Error("멤버 데이터를 가져오지 못했습니다.");
        }

        setMembers(data.members || []);
        setSelectedMembers([]);
        onSelectionChange?.([]);
      })
      .catch((err) => {
        console.error("❌ 멤버 불러오기 실패:", err.message);
        setMembers([]);
        setSelectedMembers([]);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  // ✅ 멤버 체크박스 토글
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
              &nbsp;{member.nickname || member.subject_id}
            </label>

            <VoiceSampleDisplay
              nickname={member.nickname || member.subject_id}
              sampleUrl={member.VoiceFilePath} // ✅ 반영됨
            />
          </div>
        ))
      )}
    </div>
  );
}
