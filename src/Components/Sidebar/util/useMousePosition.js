// hooks/useMousePosition.js (최적화 버전)
import { useState, useEffect, useCallback } from 'react';

export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // throttle 함수
  const throttle = useCallback((func, delay) => {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }, []);

  useEffect(() => {
    const updateMousePosition = throttle((e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    //   console.log(e.clientY);
    }, 16); // 60fps에 맞춰 16ms throttle

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, [throttle]);

  return mousePosition;
};
