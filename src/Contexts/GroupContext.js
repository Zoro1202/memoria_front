//groupcontext.js - 이상영
//그룹 & 유저 정보 관리 context
import React, { createContext, useContext, useState, useCallback } from "react";
import {toast} from 'react-hot-toast';
import {getResourceAPI} from './APIs/ResourceAPI';

const GroupsContext = createContext();

export function useGroups() {
  return useContext(GroupsContext);
}

export function GroupsProvider({ children }) {
  const resourceAPI = getResourceAPI();
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [sid, setSid] = useState();
  const [provider, setProvider] = useState();
  const [remainTime, setRemainTime] = useState();
  
  const [user, setUser]                 = useState(null); // 사용자 정보 상태
  const [profileImage, setProfileImage] = useState(null); // 프로필 이미지 상태
  //region 유저 정보
  const tokenInfo = async() => {
    try{
      const info = await resourceAPI.token_info();
      console.log('token info : ', info);
      setSid(info.subject_id);
      setProvider(info.provider);
      setRemainTime(info.remainingTime);
    }catch(err){
      console.log('token load faild:', err);
    }
  };
  //region 토큰 새로고침
  const tokenRefresh = async() =>{
    try{
      const data = await resourceAPI.token_refresh();
      console.log(`토큰 : ${data}`);
    } catch (err){
      console.log('token refresh faild:', err);
    }
  }
  // region 사용자정보
  const fetchUser = async () => {
    try {
      const userData = await resourceAPI.get_user();
      setUser(userData);
    } catch (error) {
      console.error("사용자 정보를 가져오는데 실패했습니다:", error);
    }
  };
  // region 사용자 프사
  const fetchProfileImage = async () => {
    const resourceAPI = getResourceAPI();
    try {
      const res = await resourceAPI.get_profile_image();
      const blob = await res.blob();
      const imgUrl = URL.createObjectURL(blob);
      setProfileImage(imgUrl);
    } catch (error) {
      console.error("프로필 이미지를 가져오는데 실패했습니다:", error);
      setProfileImage('/default-avatar.png'); // 기본 이미지로 설정
    }
  };

  // region 그룹 목록 로드
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

  // region 그룹 생성
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

  // region 그룹 삭제
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

  const value = {
    //그룹
    groups,
    loading,
    loadGroups,
    createGroup,
    deleteGroup,
    setGroups,
    //선택한 그룹
    selectedGroupId, 
    setSelectedGroupId,
    // 인증
    sid,
    provider,
    remainTime,
    setRemainTime,
    tokenInfo,
    tokenRefresh,
    //유저 정보
    user,
    profileImage,
    fetchUser,
    fetchProfileImage,
  };
  
  return (
    <GroupsContext.Provider value={value}>
      {children}
    </GroupsContext.Provider>
  );
}


