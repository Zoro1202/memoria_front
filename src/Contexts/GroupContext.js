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
      setSid(info.data.subject_id);
      setProvider(info.data.provider);
      setRemainTime(info.data.remainingTime);
      return 1;
    }catch(err){
      console.log('token load faild:', err);
      return -1;
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
  // region 로그아웃
  const logout = async () =>{
    let popup = null;
    // let isNaver = false;
    try{
      const res = await resourceAPI.postLogout();
      
      console.log('되돌아갈 곳 =', res.redirect)

      // 3. 네이버 로그아웃인 경우
      if (res.redirect && res.redirect.includes('/auth/naver/logout')) {
        alert('로그아웃되었습니다.');
        // isNaver = true;
        // 팝업을 "동기적으로" 띄워야 브라우저가 차단하지 않음
        popup = window.open('about:blank', 'naverLogout', 'width=500,height=600,scrollbars=yes');
        // 팝업에 네이버 로그아웃 URL로 이동
        popup.location.href = 'https://login.memoriatest.kro.kr'+res.redirect;
        // 부모창은 즉시 로그인 페이지로 이동
        setTimeout(() => {
          popup.close();
          window.location.href = 'https://login.memoriatest.kro.kr';
        }, 300);
      } else if (res.redirect) {
        console.log('카카오/로컬/구글 리다이렉트 실행');
        window.location.href = 'https://login.memoriatest.kro.kr'+res.redirect;
      } else {
        alert('로그아웃되었습니다.');
        window.location.href = 'https://login.memoriatest.kro.kr';
      }
    } catch (err){
      console.error(`로그아웃에 실패했습니다.`, err);
      //그냥 로그아웃 처리
      window.location.href = '/';
    }
  }
  // region 비밀번호 체크
  const checkPassword = useCallback(async (password)=>{
    try {
      const res = await resourceAPI.check_password(password);
      return res;
    } catch(err){
      console.error(`비밀번호 체크에 실패했습니다.`, err);
      toast.error(`비밀번호가 일치하지 않습니다!`);
    }
  },[resourceAPI]);
  // region 비밀번호 변경
  const changePassword = useCallback(async (password)=>{
    try{
      const res = await resourceAPI.change_password(password);
      return res;
    }catch(err){
      console.error(`비밀벊 변경에 실패했습니다.`, err); 
      toast.error(`비밀번호 변경에 실해했습니다!`);
    }
  },[resourceAPI]);
  //region 사용자 프사 변경
  const changeProfileImage = useCallback(async (file)=>{
    try{
      const data = await resourceAPI.uploadProfile(file); 
      if(data.success){
        console.log(`프사 업로드 성공!`);
        const imgUrl = URL.createObjectURL(file);
        setProfileImage(imgUrl);
      }
    } catch (err){
      console.log(`파일 업로드 실패!`, err);
    }
  }, [resourceAPI]);
  //region 사용자 닉네임 변경
  const changeNickname = useCallback(async (nickname)=>{
    try{
      const data = await resourceAPI.change_nickname(nickname);
      if (data.success){
        console.log('닉네임 변경 성공1!'); 
        let temp = user;
        temp.nickname = nickname;
        setUser(temp);
      }
    }catch(err){
      console.log(`닉네임 변경 실패!`, err);
    }
  },[resourceAPI]);
  // region 그룹 목록 로드
  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await resourceAPI.getGroups();
      console.log('초기 데이터:', data);
      
      // 배열을 객체로 변환 (group_id를 키로 사용)
      const groupsObject = data.data.reduce((acc, group) => {
        acc[group.group_id] = {
          name: group.group_name,
          group_id: group.group_id,
          permission: group.permission
        };
        return acc;
      }, {});
      
      setGroups(groupsObject);
      return data.data;
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
  }, [resourceAPI]);

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
       
      toast.success('그룹이 삭제되었습니다1.');
    } catch (err) {
      console.error('그룹 삭제 실패:', err);
      toast.error('그룹 삭제에 실패했습니다.');
      throw err;
    } 
  }, [resourceAPI]);
  // region 그룹 멤버 목록
  const getMemberList = useCallback(async (groupId) => { 
    try {
        // ResourceAPI에서 이미 에러 처리를 하고 있으므로, 여기서는 단순히 호출하고 반환합니다.
        const data = await resourceAPI.getMemberList(groupId);
        // API 응답 구조에 따라 data.data 또는 data 자체가 멤버 배열일 수 있습니다.
        // ResourceAPI의 getMemberList는 `return data;`로 되어 있으므로,
        // 여기서는 `data`가 멤버 배열이라고 가정합니다.
        return data.members;
    } catch (err) {
        console.error('GroupContext - 멤버 목록을 가져오는데 실패했습니다:', err);
        // GroupProfile.js에서 toast 메시지를 띄울 것이므로 여기서는 throw만 해도 됩니다.
        throw err;
    }
  }, [resourceAPI]); 
  // region 그룹 멤버 초대
  const inviteMember = useCallback(async (recipient, groupId, permission) => {
    try {
        const data = await resourceAPI.inviteMember(recipient, groupId, permission);
        if (!data.success) throw new Error(`멤버 초대 실패${data?.message}`);
        toast.success(`${recipient}님을 그룹에 초대했습니다.`);
        return data;
        // setInviteInput('');
        // fetchMemberList(group.group_id);
    } catch (error) {
        console.error('Failed to invite member:', error);
        toast.error(`멤버 초대 실패: ${error.err}`);
    }
  }, [resourceAPI]);
  // region 그룹 멤버 추방
  const kickMember = useCallback(async (groupId, recipient) => {
    try {
        const data = await resourceAPI.kickMember(groupId, recipient);
        if(data.success)
          toast.success('멤버가 추방었습니다.');
        return data;
    } catch (err) {
        console.error('GroupContext - 멤버 추방 실패:', err);
        toast.error(`멤버 추방 실패: ${err}`);
    } 
  }, [resourceAPI]);
  // region 그룹 멤버 권한 변경 
  const permissionUpdate = useCallback(async (groupId, recipient, permission) => {
    try {
        const data = await resourceAPI.permissionUpdate(groupId, recipient, permission);
        if(data.success)
          toast.success('멤버 권한이 업데이트되었습니다.');
        return data;
    } catch (err) {
        console.error('GroupContext - 멤버 권한 업데이트 실패:', err);
        toast.error(`권한 업데이트 실패: ${err}`);
    }
  }, [resourceAPI]);

  //region export
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
    logout,
    checkPassword,
    changePassword, 
    changeProfileImage,
    changeNickname,
    // 그룹관리
    getMemberList,
    inviteMember,
    kickMember,
    permissionUpdate,
  };
  
  return (
    <GroupsContext.Provider value={value}>
      {children}
    </GroupsContext.Provider>
  );
}


