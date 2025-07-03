// src/pages/Login.js
// 임시 로그인 페이지. (이제안씀)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    let mode = 'light';
    const themeData = localStorage.getItem('theme');
    if (themeData) {
      try {
        const parsed = JSON.parse(themeData);
        if (parsed && parsed.mode) {
          mode = parsed.mode;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (mode === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (id.trim() && password.trim()) {
      navigate('/main'); // 입력이 모두 있으면 메인 페이지로 이동
    } else {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
    }
  };

  return (
    <div className="notion-body login-wrapper">
      <div className="login-box">
        <h1 className="login-title">로그인</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="아이디"
            className="login-input"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="login-button">로그인</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
