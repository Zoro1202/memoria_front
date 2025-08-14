// src/Contexts/APIs/ResourceAPI.js - 이상영
export function getResourceAPI() {
  const baseUrl = 'https://login.memoriatest.kro.kr';

  return {
    // region 토큰 정보 & 검증
    // 토큰 갱신
       /* @returns {Promise<{ 
       * provider: string, 
       * subject_id: string, 
       * remainingTime: number, 
       * isValid: boolean }>}
       */
    token_info: async () => {
      try{
        const response = await fetch(`${baseUrl}/api/token-info`, {
          credentials: 'include', // 쿠키를 포함하여 요청
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(`[Error]:${response.status} : ${data.message}`);
        }
        return data;
      } catch(err) {
        throw err;
      }
    },

    // region 토큰 새로고침
    token_refresh: async ()=>{
      try{
        const response = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials:'include'
        });
        const data = await response.json();
        if (!response.ok){
          if(response.status === 401) throw new Error(`[Error]:${response.status} : ${data.message}`);
          throw new Error(`[Error]:${response.status} : ${data.message}`);
        }
        return await data;
      } catch(err) {
        throw err;
      }
    },
    
    // region 사용자 정보 가져오기
     /* 사용자 인증 제공자 (예: 'google', 'kakao', 'naver')
     * 사용자 고유 ID
     * 둘다 쿠키에 있음
     * @returns {Promise<{ nickname: string, profileImageUrl: string }>}
     */ 
    get_user: async () => { 
      try{
        const response = await fetch(`${baseUrl}/api/user`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // 쿠키를 포함하여 요청
        });

        const data = await response.json();


        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        return data.data;
      } catch(err) {
        throw err;
      }
    },
    get_profile_image: async () => {
      try{
        const response = await fetch(`${baseUrl}/api/user/profile-image`, {
          credentials: 'include', // 쿠키를 포함하여 요청
        });

        if (!response.ok) throw new Error(`[Error]:${response.status} : ${response.message}`);
        return response; // nickname 은 json이고, profileImageUrl은 blob임...
      } catch(err) {
        throw err;
      }
    },
    // region 비밀번호 체크 
    check_password: async (password) => {
      try{
        const response = await fetch(`${baseUrl}/api/user/check-password`, {
          method: 'POST',
          credentials:'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({password}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        // returns { success }
        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 비밀번호 변경
    change_password: async (password) => {
      try{
        const response = await fetch(`${baseUrl}/api/user/change-password`, {
          method: 'POST',
          credentials:'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({password}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        // returns { success }
        return data;
      } catch(err) {
        throw err;
      }
    },
    //region 사용자 닉네임 변경
    change_nickname: async (name) => {
      try{
        const response = await fetch(`${baseUrl}/api/user/change-name`, {
          method: 'POST',
          credentials:'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({name}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        // returns { success, message }
        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 사용자 프사
     /* subjectid - 사용자 고유 ID, 쿠키에 있음
     * @returns {Promise<[{ group_id: number, group_name: string, permission: string },]>}
     */
    getResource: async () => {
      try{
        const response = await fetch(`${baseUrl}/api/init1`,{
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        
        // returns [{ group_id: 1, group_name: "프로젝트 팀", permission: "editor" },]
        return response; // blob이여야함.
      } catch(err) {
        throw err;
      }
    },
    postLogout:async ()=>{
      try{
        const response = await fetch(`${baseUrl}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await response.json();
        return data;
      } catch(err){
        throw err;
      }
    },
    //region 그룹 목록 가져오기
    getGroups: async ()=>{
      try{
        const response = await fetch(`${baseUrl}/api/groups`, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        console.log(`초기 데이터:`, data);
        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 노트/링크 목록 가져오기
     /* @param {string} group_id - 그룹 ID 
     * @returns {Promise<{groupData: {notes: {note_id: number;title: string;}[];links: {src_note_id: number;dst_note_id: string;}[];}}>}
     */
    getGroupNotes: async (group_id) => {
      try{ 
        const response = await fetch(`${baseUrl}/api/notes?group_id=` + group_id, { 
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        // returns groupData: {notes: {note_id: any;title: any;}[];links: {src_note_id: any;dst_note_id: any;}[];}
        return data.data;
      } catch(err) {
        throw err;
      }
    },

    // region 노트 내용 가져오기
     /* @param {number} note_id 노트 ID
     * @returns {Promise<{content: string}>} 노트 내용
     */
    getNoteContent: async (note_id) => {
      try{
        const response = await fetch(`${baseUrl}/api/content?note_id=${note_id}`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        // returns {content: "노트 내용"}
        return data.data;
      } catch(err) {
        throw err;
      }
    },

    // region 노트 수정 또는 생성
     /* @param {Object} noteData - 노트 데이터
     * @param {number} noteData.note_id - 노트 ID (수정 시 필요)
     * @param {string} noteData.content - 노트 내용
     * @param {string} noteData.newtitle - 새 노트 제목 (수정 시 필요)
     * @param {number} noteData.group_id - 그룹 ID (노트이 속한 그룹)
     * @returns {Promise<{ note_id: number, content: string, newtitle: string, group_id: number }>} - 수정된 노트 정보
     */
    upsertNote: async (group_id, title, content, note_id = -2) => {
      try{
        const response = await fetch(`${baseUrl}/api/upsert`, {
          method: 'POST',
          credentials:'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({group_id, title, content, note_id}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        // returns { note_id, content, newtitle, group_id }
        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 노트 삭제
     /* @param {number} note_id 노트ID
     * @param {number} group_id 그룹ID
     * @returns {Promise<{ success: boolean, message: string }>} - 성공 여부
     */
    deleteNote: async (note_id, group_id) => {
      try{
        const response = await fetch(`${baseUrl}/api/delnote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note_id, group_id }),
          credentials: 'include', // 쿠키를 포함하여 요청
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        // returns { success: true } or { error: "Error message" }
        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 그룹 생성
     /* 
     * @param {string} group_name 그룹이름
     * @returns {Promise<{ group_id:number, group_name:string }>} 성공 여부, 그룹ID
     */
    createGroup: async (group_name) => {
      try{
        const response = await fetch(`${baseUrl}/api/group`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ group_name }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);
        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 그룹 삭제
     /* 
     * @param {number} group_id 그룹ID
     * @returns {Promise<{ success: boolean, group_id: number, affecttedRows: number }>} 성공 여부, 그룹ID, 영향받은 행?(아마 그룹에 속한 노트들이 같이 삭제됨)
     */
    deleteGroup: async (group_id) => {
      try{
        const response = await fetch(`${baseUrl}/api/delgroup`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_id }),
        });
        if (!response.ok) 
        {
          const data = await response.json();
          throw new Error(`[Error]:${response.status} : ${data.message}`);
}
        return response.json();
      } catch(err) {
        throw err;
      }
    },
    //region 멤버 목록 불러오기
    getMemberList: async (group_id)=>{
      // groupmember
      try{
        const response = await fetch(`${baseUrl}/api/groupmember`, {
          method: 'POST',
          headers: { 'Content-Type' : 'application/json'},
          credentials:'include', 
          body: JSON.stringify({group_id})
        });
        
        const data = await response.json();
        if(!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);

        return data.data;
      } catch(err) {
        throw err;
      }
    },
    // region 멤버 초대
    inviteMember: async(recipient, group_id, permission) => {
      try{
        const response = await fetch(`${baseUrl}/api/invite`, {
          method: 'POST',
          headers: { 'Content-Type' : 'application/json'},
          credentials:'include',
          body: JSON.stringify({recipient, group_id, permission})
        });
        const data = response.json();
        if(!response.ok) throw new Error(`[Error]:${response.status} : ${data.message}`);

        
        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 멤버 추방 
    kickMember: async (group_id, recipient) => {
      try{
        const response = await fetch(`${baseUrl}/api/kick`, {
          method: 'POST',
          credentials:'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ recipient, group_id })
        });

        const data = await response.json();
        if(!response.ok) { throw Error(data.error); }

        return data;
      } catch(err) {
        throw err;
      }
    },
    // region 멤버 권한 수정
    permissionUpdate: async (group_id, recipient, permission) =>{
      try{
        const response = await fetch(`${baseUrl}/api/authorize`, {
          method:'POST',
          credentials: 'include',
          headers:{
            'Content-Type' : 'application/json'
          },
          body: JSON.stringify({ group_id, recipient, permission})
        });
        
        const data = await response.json();
        if(!response.ok) {
          throw Error(data.error);
        }
        return data;  
      } catch(err) {
        throw err;
      }
    },
    // region 프사업로드
    uploadProfile: async (file) =>{
      try{
        if(!file) {
          throw new Error(`이미지 파일을 선택하세요`);
        }
        const formData = new FormData();
        formData.append('profileImage', file);

        const response = await fetch(`${baseUrl}/api/uploadImage`, {
          method:'POST',
          body: formData,
          credentials:'include'
        });
        const data = await response.json();
        if (data.success){
          return data;
        } else {
          throw new Error(`${data.message}`);
        }
      } catch(err) {
        throw err;
      }
    },
  };
}