// src/Contexts/APIs/APITESTPAGE.js - 이상영
import { useEffect, useState} from 'react';
import {getResourceAPI} from './ResourceAPI';
import GroupList from '../../Components/Sidebar/util/GroupList'
// import { Toaster, toast } from 'react-hot-toast';

export default function APITestPage() {
  const resourceAPI = getResourceAPI(0);
  const [testNoteIDValue, setTestNoteIDValue] = useState();
  
  const [user, setUser] = useState(null); // 사용자 정보 상태
  const [profileImage, setProfileImage] = useState(null); // 프로필 이미지 상태

  //user
  const [sid, setSid] = useState();
  const [provider, setProvider] = useState();
  const [remainTime, setRemainTime] = useState();

  // test
  const [t_noteid, setNote_id] = useState();
  const [t_groupid, setGroup_id] = useState();
  const [t_groupname, setGroupname] = useState();
  const [t_delgroupid, setdelgroupid] = useState();
  const [t_inviteid, setInviteid] = useState();
  const [t_permission, setPermission] = useState();
  // region 토큰 인증
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

  // region 노트삭제
  const deleteNote = async (noteId, groupId) => {
      try {
        const response = await resourceAPI.deleteNote(noteId, groupId);
        console.log(`response : ${response}`);
        if (response.success) {
          console.log(`Note ${noteId} deleted successfully.`);
        }
        else {
          console.error(`Failed to delete note ${noteId}: ${response.message}`);
        }
      } catch (error) {
        console.error(`Failed to delete note ${noteId}:`, error);
      }
  };
  // region 노트리스트
  const getNoteList = async (groupId)=>{
    try{
      const response = await resourceAPI.getGroupNotes(groupId);
      console.log('초기 데이터:', response);
      if(response){
        logTestResult(`노트 데이터 로드 성공! 개수 : ${response.titles.length}, 링크 개수: ${response.links.length}`);
        response.titles.forEach(g => {
          logTestResult(`노트 ${response.titles.indexOf(g) + 1} : 노트ID: ${g.note_id}, 타이틀: ${g.title}, 그룹ID: ${groupId}`);
        });
        response.links.forEach(g => {
          logTestResult(`링크 ${response.links.indexOf(g) + 1} : src: ${g.src_note_id}, dst_title: ${g.dst_title}`);
        });
      }
    } catch(err)
    {
      logTestResult(`그룹 노트&링크 데이터 로드 실패: ${err.message}`, false);
    }
  }


  // region 노트 요청
  const getContent = async (noteId) => {
    try {
      const response = await resourceAPI.getNoteContent(noteId);
      console.log(`response : ${response}`);
      if (response) {
        console.log(`Content for note ${noteId}:`, response.content);
        logTestResult(`내용 조회 성공: "${response.content}"`);
      } else {
        console.error(`Failed to get content for note ${noteId}: ${response.message}`);
      }       
    } catch (error) {
      console.error(`Failed to get content for note ${noteId}:`, error);
    }
      
  };
  
  // region 유저정보
  const fetchUser = async () => {
    
    try {
      const userData = await resourceAPI.get_user();
      setUser(userData);
    } catch (error) {
      console.error("사용자 정보를 가져오는데 실패했습니다:", error);
    }
  };
  // region 프사
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
  
  useEffect(() => {
    tokenInfo();
    fetchUser();
    fetchProfileImage();
    setInterval(()=>{
        setRemainTime(prevRemainTime => {
          if (prevRemainTime < 650) {
            tokenRefresh();
            tokenInfo();
            return 900;
          }
          return prevRemainTime - 1;
        });
      }, 1000);
    // eslint-disable-next-line
  },[]);
  // region 로그 띄우기
  function logTestResult(message, isSuccess = true) {
    const testResults = document.getElementById('test-results');
    const resultItem = document.createElement('div');
    resultItem.style.color = isSuccess ? 'green' : 'red';
    resultItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    testResults.appendChild(resultItem);
    testResults.scrollTop = testResults.scrollHeight;
  }
  // region 로그 클리어
  function logTestResultClear(){
    const testResults = document.getElementById('test-results');
    while (testResults.hasChildNodes()){
      testResults.removeChild( testResults.firstChild);
    }
  }
  // region 그룹
  async function groupLoad (){
    
    try {
      const data = await resourceAPI.getGroups();
      console.log('초기 데이터:', data);
      data.forEach(g => {
        logTestResult(`초기 데이터 로드 성공! 그룹ID: ${g.group_id}, 그룹이름: ${g.group_name}, 권한: ${g.permission}`);
      });
    } catch (err) {
      logTestResult(`초기 데이터 로드 실패: ${err.message}`, false);
    }
  }
  //region 그룹 생성
  async function groupCreate(group_name) {
    
    try {
      const data = await resourceAPI.createGroup(group_name);
      logTestResult(`그룹 생성 성공! ID: ${data.group_id}, 이름: "${group_name}"`);
    } catch (err) {
      logTestResult(`그룹 생성 실패: ${err.message}`, false);
    }
  }
  // region 그룹 삭제
  async function groupDelete(group_id) {
    
    try{
      const data = await resourceAPI.deleteGroup(group_id);
      console.log(`groupDelete${data}`);
      logTestResult(`그룹 삭제 성공 ID : ${group_id}`);
    }
    catch(err){
      logTestResult(`그룹 삭제 실패: ${err.message}`, false);
    }
  }

  // region 그룹 멤버 초대
  async function groupInvite(group_id, recipient, permission) {
    
    try{
      const data = await resourceAPI.inviteMember(recipient, group_id, permission);
      console.log(`groupInvite${data}`);
      logTestResult(`초대 성공! ${recipient} 사용자를 ${permission} 권한으로 초대`);
    }
    catch(err){
      logTestResult(`멤버 초대 실패: ${err.message}`, false);
    }
  }
  // region 멤버 추방
  async function groupKick(group_id, recipient) {
    
    try{
      const data = await resourceAPI.kickMember(group_id, recipient);
      console.log(`groupKick${data}`);
      logTestResult(`추방 성공! ${recipient} 사용자 추방`);
    }
    catch (err){
      logTestResult(`멤버 추방 실패: ${err.message}`, false);
    }
  }
  // region 권한 변경
  async function groupPermission(group_id, recipient, permission){
    
    try{
      const data = await resourceAPI.permissionUpdate(group_id, recipient, permission);
      console.log(`groupPermission${data}`);
      logTestResult(`권한 변경 성공! ${recipient}: ${permission}`);
    } catch(err){
      logTestResult(`권한 변경 실패: ${err.message}`, false);
    }
  }
  // region 프로필 이미지 업로드
  async function uploadProfile() {
    
    try{
      //getElememtbyId로 이미지 가져오기
      const input = document.getElementById('profile-image-input');
      const file = input.files[0];
      const data = await resourceAPI.uploadProfile(file);
      console.log(`uploadProfile${data}`);
      logTestResult(`프로필 사진 변경 성공!`);
    } catch(err)
    {
      logTestResult(`프사 업로드 실패: ${err.message}`, false);
    }
  }
  //DOM
  return (
    <div className="apitestpage">
      {/* <Toaster> */}
        <h1>API Test Page</h1>
        
        <button onClick={()=>{logTestResultClear()}}>logClear</button>
        <button onClick={()=>{
          tokenRefresh();
          tokenInfo();
          fetchUser();
          fetchProfileImage();
        }}>refreshToken</button>
        {user && (
          <div className="sidebar-footer">
            <div className="user-profile">
            <img src={profileImage} alt="User Avatar" className="user-avatar" />
            <span className="user-name">{user.nickname}</span>
            <span>: {provider} : {remainTime}</span>
            </div>
          </div>
        )}
        
        <p>Group List Test</p>
        <button onClick={() => {groupLoad()}}>Group List</button>
        <GroupList onGroupSelect={(group)=>{
          console.log(group);
          setGroup_id(group.group_id);
          }}/>
        <p>Delete Note Test</p>
        <input
          type="number"
          value={testNoteIDValue}
          onChange={(e) => setTestNoteIDValue(e.target.value)}
          placeholder="Enter Note ID"
          />
        <input
          type="number"
          value={t_groupid}
          onChange={(e) => setGroup_id(e.target.value)}
          placeholder="Enter Group ID"
          />
        <button onClick={() => {deleteNote(testNoteIDValue, t_groupid); console.log(`Delete Note(${testNoteIDValue}, ${t_groupid})`)}}>
          Delete Note {testNoteIDValue}</button>
        
        <p>NoteList Request Test</p>
        <input
          type="number"
          value={t_groupid}
          onChange={(e) => setGroup_id(e.target.value)}
          placeholder="Enter Group ID"
          />
        <button onClick={()=>{getNoteList(t_groupid)}}>Note List</button>
        
        <p>Title & Content Request Test</p>
        <input
          type="number"
          value={t_noteid}
          onChange={(e) => setNote_id(e.target.value)}
          placeholder="Enter Note ID"
          />
        <input
          type="number"
          value={t_groupid}
          onChange={(e) => setGroup_id(e.target.value)}
          placeholder="Enter Group ID"
          />
        <button onClick={() =>{getContent(t_noteid)}}>Content Load</button>
        
        <p>Creat Group</p>
        <input
          type='string'
          value={t_groupname}
          onChange={(e) => setGroupname(e.target.value)}
          placeholder='Enter Group Name'
          />
        <button onClick={() =>{groupCreate(t_groupname)}}>Create Group</button>

        <p>Delete Group</p>
        <input
          type='number'
          value={t_delgroupid}
          onChange={(e) => setdelgroupid(e.target.value)}
          placeholder='Enter Group ID'
          />
        <button onClick={() =>{groupDelete(t_delgroupid)}}>Delete Group</button>

        <p>Invite Member</p>
        <input
          type='number'
          value={t_groupid}
          onChange={(e) => setGroup_id(e.target.value)}
          placeholder='Enter Group ID'
          />
        <input
          type='string'
          value={t_inviteid}
          onChange={(e) => setInviteid(e.target.value)}
          placeholder='Enter recipient ID'
          />
        <input
          type='number'
          value={t_permission}
          onChange={(e) => setPermission(e.target.value)}
          placeholder='Enter Permission(0~3)'
          />
        <button onClick={()=>{groupInvite(t_groupid, t_inviteid, t_permission)}}>Invite</button>

        <p>Kick Member</p>
        <input
          type='number'
          value={t_groupid}
          onChange={(e) => setGroup_id(e.target.value)}
          placeholder='Enter Group ID'
          />
        <input
          type='string'
          value={t_inviteid}
          onChange={(e) => setInviteid(e.target.value)}
          placeholder='Enter recipient ID'
          />
        <button onClick={()=>{groupKick(t_groupid, t_inviteid)}}>Kick</button>
        
        <p>UpdatePermission</p>
        <input
          type='number'
          value={t_groupid}
          onChange={(e) => setGroup_id(e.target.value)}
          placeholder='Enter Group ID'
          />
        <input
          type='string'
          value={t_inviteid}
          onChange={(e) => setInviteid(e.target.value)}
          placeholder='Enter recipient ID'
          />
        <input
          type='number'
          value={t_permission}
          onChange={(e) => setPermission(e.target.value)}
          placeholder='Enter Permission(0~3)'
          />
        <button onClick={()=>{groupPermission(t_groupid, t_inviteid, t_permission)}}>Update</button>

        <p>UpdateProfileImage</p>
        <input type="file" id="profile-image-input" accept="image/png, image/jpeg, image/webp" />
        <button onClick={()=>{uploadProfile()}}>업로드</button>

        <div id="test-results"></div>
      {/* </Toaster> */}
    </div>
  );
}