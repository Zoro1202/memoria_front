//groupcontext.js - 이상영
//노트 관리 context
//사용하려는 스코프 상위에 provider로 감싸줘야 사용 가능
//나중에 백엔드와 통신해야 함
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import {toast} from 'react-hot-toast';
import { set } from "remirror";
const GroupsContext = createContext();

export function GroupsProvider({ children }) {
    // 그룹 목록 상태
    const [Groups, setGroups] = useState({
        1: { name: "Group A", group_id: 1 },
        2: { name: "Group B", group_id: 2 },
        // 초기 그룹 데이터
    });
    // 그룹 생성 함수
    const createGroup = useCallback((name) => {
        const newGroupId = Object.keys(Groups).length + 1;
        const newGroup = { name, group_id: newGroupId };
        setGroups((prevGroups) => ({
            ...prevGroups,
            [newGroupId]: newGroup,
        }));
        toast.success(`그룹 "${name}"이(가) 생성되었습니다.`);
    }, [Groups]);
  // post group subject_id, group_name

  return (
    <GroupsContext.Provider value={{Groups, setGroups, createGroup, updateGroup, deleteGroup}}>
      {children}
    </GroupsContext.Provider>
  );
}

// Hook으로 편하게 사용
export function useNotes() {
  return useContext(GroupsContext);
}

