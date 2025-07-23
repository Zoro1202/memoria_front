import React, { useEffect, useState } from "react";
import { useGroups } from "../../Contexts/GroupContext";
import VoiceSampleDisplay from "./VoiceSample";

export default function GroupSelect({ onSelectionChange }) {
  const { groups, selectedGroupId, setSelectedGroupId, loadGroups } = useGroups();
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const groupList = Object.values(groups);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([]);
      setSelectedMembers([]);
      onSelectionChange?.([]);
      return;
    }

    fetch(`/api/groups/${selectedGroupId}/members`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(async (res) => {
        const contentType = res.headers.get("Content-Type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`API 응답이 JSON이 아님: ${text}`);
        }
        return res.json();
      })
      .then(data => {
        setMembers(data.members || []);
        setSelectedMembers([]);
        onSelectionChange?.([]);
      })
      .catch(err => {
        console.error("멤버 불러오기 실패:", err.message);
        setMembers([]);
        setSelectedMembers([]);
      });
  }, [selectedGroupId]);

  const toggleMember = (id) => {
    const updated = selectedMembers.includes(id)
      ? selectedMembers.filter(mid => mid !== id)
      : [...selectedMembers, id];
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
            onChange={e => setSelectedGroupId(e.target.value)}
          >
            <option value="">-- 그룹을 선택하세요 --</option>
            {groupList.map(group => (
              <option key={group.group_id} value={group.group_id}>
                {group.name || group.group_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h4>화자(멤버) 선택</h4>
      {members.map(member => (
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
            nickname={member.nickname}
            sampleUrl={member.sample_file_path}
          />
        </div>
      ))}
    </div>
  );
}
