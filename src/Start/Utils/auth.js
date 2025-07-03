// utils/auth.js
export function getValidAccessToken(key = 'accessToken') {
  const token = sessionStorage.getItem(key);
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload));
    if (exp * 1000 > Date.now()) return token;   // 아직 유효
  } catch (e) {
    console.warn('Failed to decode JWT:', e);
  }
  // 만료·변조 ⇒ 제거
  sessionStorage.removeItem(key);
  return null;
}
