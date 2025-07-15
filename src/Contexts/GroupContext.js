//groupcontext.js - 이상영
//노트 관리 context
//사용하려는 스코프 상위에 provider로 감싸줘야 사용 가능
//나중에 백엔드와 통신해야 함
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import {toast} from 'react-hot-toast';
import {getResourceAPI} from './APIs/ResourceAPI';
const GroupsContext = createContext();

export function GroupsProvider({ children }) {
  const resourceAPI = getResourceAPI();
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(false);
    // 그룹 목록 로드
  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await resourceAPI.getGroups();
      console.log('초기 데이터:', data);
      
      // 배열을 객체로 변환 (group_id를 키로 사용)
      const groupsObject = data.reduce((acc, group) => {
        acc[group.group_id] = {
          name: group.group_name,
          group_id: group.group_id,
          permission: group.permission
        };
        return acc;
      }, {});
      
      setGroups(groupsObject);
      return data;
    } catch (err) {
      console.error('그룹 로드 실패:', err);
      toast.error('그룹 목록을 불러올 수 없습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 그룹 생성
  const createGroup = useCallback(async (groupName) => {
    try {
      const data = await resourceAPI.createGroup(groupName);
      
      // 로컬 상태 업데이트
      const newGroup = {
        name: groupName,
        group_id: data.group_id,
        permission: data.permission || 0 // 기본값 설정
      };
      
      setGroups(prevGroups => ({
        ...prevGroups,
        [data.group_id]: newGroup
      }));
      
      toast.success(`그룹 "${groupName}"이(가) 생성되었습니다.`);
      return data;
    } catch (err) {
      console.error('그룹 생성 실패:', err);
      toast.error('그룹 생성에 실패했습니다.');
      throw err;
    }
  }, []);

  // 그룹 삭제
  const deleteGroup = useCallback(async (groupId) => {
    try {
      await resourceAPI.deleteGroup(groupId);
      
      // 로컬 상태에서 제거
      setGroups(prevGroups => {
        const newGroups = { ...prevGroups };
        delete newGroups[groupId];
        return newGroups;
      });
      
      toast.success('그룹이 삭제되었습니다.');
    } catch (err) {
      console.error('그룹 삭제 실패:', err);
      toast.error('그룹 삭제에 실패했습니다.');
      throw err;
    }
  }, []);

  return (
    <GroupsContext.Provider value={{
      groups,
      loading,
      loadGroups,
      createGroup,
      deleteGroup,
      setGroups
      }}>
      {children}
    </GroupsContext.Provider>
  );
}

// Hook으로 편하게 사용
export function useGroups() {
  return useContext(GroupsContext);
}

