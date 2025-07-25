// ChangePasswordModal.js
import React, { useState, useRef, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, Shield, Check, AlertCircle } from 'lucide-react';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const currentPasswordRef = useRef(null);

  // 모달이 열릴 때 포커스 및 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
      if (currentPasswordRef.current) {
        currentPasswordRef.current.focus();
      }
    }
  }, [isOpen]);

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

    // 실시간 에러 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = '현재 비밀번호를 입력해주세요.';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = '새 비밀번호를 입력해주세요.';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = '비밀번호는 최소 8자 이상이어야 합니다.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '새 비밀번호와 일치하지 않습니다.';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = '현재 비밀번호와 다른 비밀번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({
        submit: error.message || '비밀번호 변경에 실패했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: '' };
    
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    strength = Object.values(checks).filter(Boolean).length;

    if (strength < 2) return { level: 1, text: '약함', color: '#ef4444' };
    if (strength < 4) return { level: 2, text: '보통', color: '#f59e0b' };
    return { level: 3, text: '강함', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  if (!isOpen) return null;

  return (
    <div className="change-password-overlay" onClick={onClose}>
      <div 
        className="change-password-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="change-password-header">
          <div className="header-icon">
            <Lock size={20} />
          </div>
          <h2>비밀번호 변경</h2>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="change-password-form">
          {/* 현재 비밀번호 */}
          <div className="form-group">
            <label htmlFor="currentPassword">현재 비밀번호</label>
            <div className="password-input-container">
              <input
                ref={currentPasswordRef}
                id="currentPassword"
                name="currentPassword"
                type={showPassword.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={handleInputChange}
                className={errors.currentPassword ? 'error' : ''}
                placeholder="현재 비밀번호를 입력하세요"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="error-message">
                <AlertCircle size={14} />
                {errors.currentPassword}
              </span>
            )}
          </div>

          {/* 새 비밀번호 */}
          <div className="form-group">
            <label htmlFor="newPassword">새 비밀번호</label>
            <div className="password-input-container">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleInputChange}
                className={errors.newPassword ? 'error' : ''}
                placeholder="새 비밀번호를 입력하세요"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            {/* 비밀번호 강도 표시 */}
            {formData.newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ 
                      width: `${(passwordStrength.level / 3) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  />
                </div>
                <span 
                  className="strength-text"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.text}
                </span>
              </div>
            )}
            
            {errors.newPassword && (
              <span className="error-message">
                <AlertCircle size={14} />
                {errors.newPassword}
              </span>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <div className="password-input-container">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="새 비밀번호를 다시 입력하세요"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
              <span className="success-message">
                <Check size={14} />
                비밀번호가 일치합니다
              </span>
            )}
            {errors.confirmPassword && (
              <span className="error-message">
                <AlertCircle size={14} />
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* 전체 에러 메시지 */}
          {errors.submit && (
            <div className="submit-error">
              <AlertCircle size={16} />
              {errors.submit}
            </div>
          )}

          {/* 보안 팁 */}
          <div className="security-tips">
            <Shield size={16} />
            <div className="tips-content">
              <strong>안전한 비밀번호 만들기:</strong>
              <ul>
                <li>최소 8자 이상 사용</li>
                <li>대문자, 소문자, 숫자, 특수문자 조합</li>
                <li>개인정보나 사전 단어 사용 금지</li>
              </ul>
            </div>
          </div>
        </form>

        {/* 푸터 */}
        <div className="change-password-footer">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={onClose}
          >
            취소
          </button>
          <button 
            type="submit" 
            className="save-btn"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner-small" />
                변경 중...
              </>
            ) : (
              <>
                <Lock size={16} />
                비밀번호 변경
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
