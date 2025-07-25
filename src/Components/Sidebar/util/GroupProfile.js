// GroupProfile.js
import React, { useState, useEffect } from 'react';
import './GroupProfile.css';
import { X, Search } from 'lucide-react'; // Search 아이콘 추가 (초대 시 사용)
import { toast } from 'react-hot-toast'; // 토스트 메시지 알림용
import { useGroups } from '../../../Contexts/GroupContext'; // GroupContext를 사용하여 API 함수 호출

const GroupWindowModal = ({ onClose, group, onSave }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [groupName, setGroupName] = useState(group?.name || '');
    const [groupIntro, setGroupIntro] = useState(group?.group_intro || '');
    const [members, setMembers] = useState([]); // 멤버 목록 상태
    const [inviteInput, setInviteInput] = useState(''); // 초대 입력 필드
    const { getMemberList, inviteMember, kickMember, permissionUpdate, deleteGroup } = useGroups(); // Context에서 API 함수 가져오기

    // 모달이 열릴 때 또는 그룹이 변경될 때 멤버 목록 불러오기
    useEffect(() => {
        if (group?.group_id) {
            fetchMemberList(group.group_id);
        }
    }, [group?.group_id]); // group.group_id가 변경될 때마다 실행


    //region 멤버 목록
    const fetchMemberList = async (groupId) => {
        try {
            const data = await getMemberList(groupId);
            // API 응답 형태에 따라 members 배열을 설정합니다.
            // 예를 들어, data.members가 실제 멤버 배열이라면 setMembers(data.members);
            setMembers(data || []); // API 응답이 직접 멤버 배열이라고 가정
        } catch (error) {
            console.error('Failed to fetch member list:', error);
            toast.error('멤버 목록을 불러오는데 실패했습니다.');
        }
    };

    
    //region 멤버 초대
    const handleInviteMember = async () => {
        const recipient = inviteInput.trim();
        if (!recipient) {
            toast.error('초대할 사용자 (이메일 또는 아이디)를 입력해주세요.');
            return;
        }
        if (!group?.group_id) {
            toast.error('그룹 정보가 없어 멤버를 초대할 수 없습니다.');
            return;
        }

        try {
            // 기본 권한을 'editor'로 설정 0 = host, 1 = manager, 2 = editor, 3 = viewer
            await inviteMember(recipient, group.group_id, 2);
            toast.success(`${recipient}님을 그룹에 초대했습니다.`);
            setInviteInput(''); // 입력 필드 초기화
            fetchMemberList(group.group_id); // 멤버 목록 새로고침
        } catch (error) {
            console.error('Failed to invite member:', error);
            toast.error(`멤버 초대 실패: ${error.message}`);
        }
    };


    //region 멤버 추방
    const handleKickMember = async (recipientId) => {
        if (!group?.group_id) {
            toast.error('그룹 정보가 없어 멤버를 추방할 수 없습니다.');
            return;
        }

        try {
            await kickMember(recipientId, group.group_id);
            toast.success('멤버를 추방했습니다.');
            fetchMemberList(group.group_id); // 멤버 목록 새로고침
        } catch (error) {
            console.error('Failed to kick member:', error);
            toast.error(`멤버 추방 실패: ${error.message}`);
        }
    };


    //region 그룹 삭제
    const handleDeleteGroup = async () => {
        if (!group?.group_id) {
            toast.error('그룹 정보가 없어 그룹을 삭제할 수 없습니다.');
            return;
        }

        if (window.confirm('정말로 그룹을 삭제하시겠습니까?')) {
            try {
                await deleteGroup(group.group_id); // 그룹 삭제 API 호출
                onClose(); 
            } catch (error) {
                console.error('Failed to delete group:', error);
                toast.error(`그룹 삭제 실패: ${error.message}`);
            }
        }
    }


    //region 권한 변경
    const handlePermissionUpdate = async (recipientId, permissionValue, currentGroup) => {
        if (!currentGroup?.group_id) {
            toast.error('그룹 정보가 없어 권한을 변경할 수 없습니다.');
            return;
        }

        // --- 여기부터 수정된 부분입니다 ---
        let permission;
        switch (permissionValue) {
            case 'host':
                permission = 0;
                break;
            case 'manager':
                permission = 1;
                break;
            case 'editor':
                permission = 2;
                break;
            case 'viewer':
                permission = 3;
                break;
            default:
                toast.error('유효하지 않은 권한입니다.');
                return;
        }
        // --- 여기까지 수정된 부분입니다 ---

        try {
            // groupId, recipient, permission 순서로 전달
            await permissionUpdate(currentGroup.group_id, recipientId, permission);
            toast.success('멤버 권한이 업데이트되었습니다.');
            fetchMemberList(currentGroup.group_id);
        } catch (error) {
             console.error('Failed to update permission:', error);
            toast.error(`권한 업데이트 실패: ${error.message}`);
        }
    };


    return (
        <div className="modal-overlay">
            <div className="modal-window">
                {/* 닫기 버튼 */}
                <button className="close-btn" onClick={onClose}>
                    <X size={18} />
                </button>

                {/* 상단 탭 */}
                <div className="modal-tabs">
                    <button
                        className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        그룹 정보
                    </button>
                    <button
                        className={`modal-tab ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        계정
                    </button>
                </div>

                {/* 탭 내용 */}
                <div className="modal-content">
                    {activeTab === 'info' && (
                        <div className="modal-tab-content">
                            <div className="form-group">
                                <label htmlFor="group-name">그룹 이름</label>
                                <input
                                    id="group-name"
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                            </div>

                            {/* <div className="form-group">
                                <label htmlFor="group-intro">그룹 소개</label>
                                <textarea
                                    id="group-intro"
                                    rows="4"
                                    value={groupIntro}
                                    onChange={(e) => setGroupIntro(e.target.value)}
                                />
                            </div> */}
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="modal-tab-content">
                            <ul className="group-members-list">
                                {members.length > 0 ? (
                                    members.map((user) => (
                                        <li key={user.id} className="member-item">
                                            <span>{user.name}</span>
                                            <div className="member-actions">
                                                <select
                                                    className="permission-select"
                                                    // user.permission이 숫자 값이라면, 여기서 문자열로 변환해야 UI에 올바르게 표시됩니다.
                                                    // 예를 들어, user.permission이 0이면 "host", 1이면 "manager" 등으로 매핑
                                                    value={
                                                        user.permission === 0 ? 'host' :
                                                        user.permission === 1 ? 'manager' :
                                                        user.permission === 2 ? 'editor' :
                                                        user.permission === 3 ? 'viewer' : ''
                                                    }
                                                    onChange={(e) => handlePermissionUpdate(user.subject_id, e.target.value, group)}
                                                >
                                                    <option value="host">호스트</option>
                                                    <option value="manager">관리자</option>
                                                    <option value="editor">편집자</option>
                                                    <option value="viewer">뷰어</option>
                                                </select>
                                                <button
                                                    className="kick-btn"
                                                    onClick={() => handleKickMember(user.id)}
                                                >
                                                    추방
                                                </button>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="no-members-message">그룹에 멤버가 없습니다.</li>
                                )}
                            </ul>
                            <div className="invite-section">
                                <input
                                    type="text"
                                    placeholder="이메일 또는 아이디로 초대"
                                    value={inviteInput}
                                    onChange={(e) => setInviteInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
                                />
                                <button className="invite-btn" onClick={handleInviteMember}>
                                    <Search size={16} style={{ marginRight: 6 }} /> 초대
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {/* 저장, 그룹 삭제 버튼 */}
                <div className="modal-actions">
                    <button className='delete-btn' onClick={() => {
                        if (window.confirm('정말로 그룹을 삭제하시겠습니까?')) {
                            handleDeleteGroup();
                            onClose();
                        }
                    }}>그룹 삭제</button>
                    <button className="save-btn" onClick={onSave}>저장</button>
                </div>
            </div>
        </div>
    );
};

export default GroupWindowModal;