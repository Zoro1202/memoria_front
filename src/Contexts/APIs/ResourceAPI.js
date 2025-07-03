export function getResourceAPI() {
  const baseUrl = 'https://login.memoriatest.kro.kr/api';

  return {
    /** 사용자 정보 토큰 값으로 가져오기 (토큰은 알아서 쿠키로 전달됨)
       * @returns {Promise<{ 
       * provider: string, 
       * subject_id: string, 
       * remainingTime: number, 
       * isValid: boolean }>}
       */
    token_info: async () => {
      const response = await fetch(`${baseUrl}/token_info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch token info');
      return response.json();
    },

    /** 사용자 정보 provider랑 subjectid로 가져오기
     * 사용자 인증 제공자 (예: 'google', 'kakao', 'naver')
     * 사용자 고유 ID
     * 둘다 쿠키에 있음
     * @returns {Promise<{ nickname: string, profileImageUrl: string }>}
     */
    get_user: async () => {
        const response = await fetch(`${baseUrl}/user`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch user info');
      return response.json();
      
    },

    /** 사용자 고유 ID로 그룹 목록 가져오기
     * subjectid - 사용자 고유 ID, 쿠키에 있음
     * @returns {Promise<[{ group_id: number, group_name: string, permission: string },]>}
     */
    getResource: async () => {
      const response = await fetch(`${baseUrl}/init1`,{
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch resource');
      
      // returns [{ group_id: 1, group_name: "프로젝트 팀", permission: "editor" },]
      return response;
    },

    /** /init2 그룹id로 제목/링크 목록 가져오기
     * @param {string} group_id - 그룹 ID 
     * @returns {Promise<{groupData: {notes: {note_id: number;title: string;}[];links: {src_note_id: number;dst_note_id: string;}[];}}>}
     */
    getGroupNotes: async (group_id) => {
      const response = await fetch(`${baseUrl}/init2`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id }),
      });
      if (!response.ok) throw new Error('Failed to fetch group notes');
      // returns groupData: {notes: {note_id: any;title: any;}[];links: {src_note_id: any;dst_note_id: any;}[];}
      return response.json();
    },

    /** 노트 1개 내용 가져오기
     * @param {number} note_id 노트 ID
     * @returns {Promise<{content: string}>} 노트 내용
     */
    getNoteContent: async (note_id) => {
      const response = await fetch(`${baseUrl}/content`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id }),
      });
      if (!response.ok) throw new Error('Failed to fetch note content');
      // returns {content: "노트 내용"}
      return response.json();
    },

    /** 노트 수정 또는 생성
     * @param {Object} noteData - 노트 데이터
     * @param {number} noteData.note_id - 노트 ID (수정 시 필요)
     * @param {string} noteData.content - 노트 내용
     * @param {string} noteData.newtitle - 새 노트 제목 (수정 시 필요)
     * @param {number} noteData.group_id - 그룹 ID (노트이 속한 그룹)
     * @returns {Promise<{ note_id: number, content: string, newtitle: string, group_id: number }>} - 수정된 노트 정보
     */
    upsertNote: async (noteData) => {
      const response = await fetch(`${baseUrl}/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      if (!response.ok) throw new Error('Failed to upsert note');
      // returns { note_id, content, newtitle, group_id }
      return response.json();
    },
    /**노트 삭제
     * @param {number} note_id 노트ID
     * @param {number} group_id 그룹ID
     * @returns {Promise<{ success: boolean, message: string }>} - 성공 여부
     */
    deleteNote: async (note_id, group_id) => {
      const response = await fetch(`${baseUrl}/delnote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id, group_id }),
        credentials: 'include', // 쿠키를 포함하여 요청
      });
      const result = await response.json();
      if (!response.ok) throw new Error(`[오류]${response.status}: ${result.message}`);
      // returns { success: true } or { error: "Error message" }
      return result;
    },
    /** 그룹 생성
     * @param {string} group_name 그룹이름
     * @returns {Promise<{ success:boolean, group_id:number }>} 성공 여부, 그룹ID
     */
    createGroup: async (group_name) => {
      const response = await fetch(`${baseUrl}/create_group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name }),
      });
      if (!response.ok) throw new Error('Failed to create group');
      return response.json();
    },
    /**
     * 
     * @param {number} group_id 그룹ID
     * @returns {Promise<{ success: boolean, group_id: number, affecttedRows: number }>} 성공 여부, 그룹ID, 영향받은 행?(아마 그룹에 속한 노트들이 같이 삭제됨)
     */
    deleteGroup: async (group_id) => {
      const response = await fetch(`${baseUrl}/delete_group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id }),
      });
      if (!response.ok) throw new Error('Failed to delete group');
      return response.json();
    },
  };
}