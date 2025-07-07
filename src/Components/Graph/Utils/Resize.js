// 윈도우 크기 바뀌면 호출되는 이벤트 리스너 사이즈 state 변경함.
import { useState, useEffect } from 'react';

export default function useWindowSize() {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);

  useEffect(() => {
    const handler = () => setSize([window.innerWidth, window.innerHeight]);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size; // [width, height]
}
