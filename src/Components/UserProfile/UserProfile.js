// UserWindowModal.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  User, 
  Shield, 
  Camera, 
  Save, 
  LogOut,
  Settings,
  Bell,
  Lock,
  Palette,
  Monitor
} from 'lucide-react';
import './UserProfile.css';
import ChangePasswordModal from './ChangePasswordModal';
import { useGroups } from '../../Contexts/GroupContext';
import toast from 'react-hot-toast';

const UserWindowModal = ({ isOpen, onClose, user, profileImage, onSave, onLogout }) => {
  const {checkPassword, changePassword} = useGroups();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    email: user?.email || '',
    bio: user?.bio || ''
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(profileImage);
  const fileInputRef = useRef(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  

  // 모달이 열릴 때 사용자 데이터로 초기화
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        nickname: user.nickname || '',
        email: user.email || '',
        bio: user.bio || ''
      });
      setProfileImagePreview(profileImage);
    }
  }, [isOpen, user, profileImage]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const saveData = {
      ...formData,
      profileImage: profileImageFile
    };
    onSave(saveData);
  };

  const handleLogout = () => {
    if (window.confirm('정말 로그아웃하시겠습니까?')) {
      onLogout();
      onClose();
    }
  };

  const handleChangePassword = () => {
    //비번 변경 모달띄우기...
    if(user?.provider === 'local')
      setIsPasswordModalOpen(true);
    else
      toast.error(`local만 비밀번호 변경이 가능합니다.`);
  };

  const handlePasswordSave = async (passwordData) => {
    console.log('Changing password:', passwordData);
    // 실제 비밀번호 변경 API 호출
    const ret = await checkPassword(passwordData.currentPassword);
    if(ret.success)
    {
      const ret2 = await changePassword(passwordData.newPassword);
      if(ret2.success)
        toast.success(`비밀번호 변경 성공!`);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: '프로필', icon: User },
    { id: 'account', label: '계정', icon: Shield },
    { id: 'preferences', label: '환경설정', icon: Settings },
    { id: 'notifications', label: '알림', icon: Bell }
  ];

  return (
    <div className="user-modal-overlay" onClick={onClose}>
      <div 
        className="user-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="user-modal-header">
          <h2>사용자 설정</h2>
          <button onClick={onClose} className="user-modal-close">
            <X size={20} />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="user-modal-tabs">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="user-modal-content">
          {activeTab === 'profile' && (
            <div className="user-modal-tab-content">
              <h3>프로필 정보</h3>
              
              {/* 프로필 이미지 */}
              <div className="profile-image-section">
                <div className="profile-image-container">
                  <img 
                    src={profileImagePreview || '/default-avatar.png'} 
                    alt="Profile" 
                    className="profile-image-large"
                  />
                  <button 
                    className="change-image-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <p className="image-help-text">클릭하여 프로필 이미지 변경</p>
              </div>

              {/* 닉네임 */}
              <div className="form-group">
                <label htmlFor="nickname">닉네임</label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  placeholder="닉네임을 입력하세요"
                />
              </div>

              {/* 자기소개 */}
              {/* <div className="form-group">
                <label htmlFor="bio">자기소개</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="간단한 자기소개를 작성해주세요"
                  rows={3}
                />
              </div> */}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="user-modal-tab-content">
              <h3>계정 정보</h3>
              
              {/* 이메일 */}
              <div className="form-group">
                <label htmlFor="email">이메일</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled
                />
                <small className="form-help">이메일은 변경할 수 없습니다</small>
              </div>

              {/* 로그인 제공자 */}
              <div className="form-group">
                <label>로그인 제공자</label>
                <div className="provider-info">
                  <Shield size={16} />
                  <span>{user?.provider || 'Google'}</span>
                </div>
              </div>

              {/* 비밀번호 변경 */}
              <div className="form-group">
                <label>비밀번호</label>
                <button className="secondary-btn" onClick={handleChangePassword}>
                  <Lock size={16} />
                  비밀번호 변경
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="user-modal-tab-content">
              <h3>환경 설정</h3>
              
              {/* 테마 설정 */}
              <div className="form-group">
                <label>테마</label>
                <div className="theme-options">
                  <button className="theme-option active">
                    <Monitor size={16} />
                    시스템 설정 따름
                  </button>
                  <button className="theme-option">
                    <Palette size={16} />
                    라이트 모드
                  </button>
                  <button className="theme-option">
                    <Palette size={16} />
                    다크 모드
                  </button>
                </div>
              </div>

              {/* 언어 설정 */}
              <div className="form-group">
                <label htmlFor="language">언어</label>
                <select id="language" defaultValue="ko">
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>

              {/* 자동 저장 */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span className="checkmark"></span>
                  자동 저장 활성화
                </label>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="user-modal-tab-content">
              <h3>알림 설정</h3>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span className="checkmark"></span>
                  새 노트 공유 알림
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span className="checkmark"></span>
                  댓글 알림
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  이메일 알림
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="user-modal-footer">
          <div className="footer-left">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
          {activeTab === 'profile' && 
          <div className="footer-right">
            <button className="save-btn" onClick={handleSave}>
              <Save size={16} />
              저장
            </button>
            <button className="cancel-btn" onClick={onClose}>
              취소
            </button>
          </div>}
        </div>
        {/* <ChangePasswordModal/> */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSave={handlePasswordSave}
        />
      </div>
    </div>
  );
};

export default UserWindowModal;
