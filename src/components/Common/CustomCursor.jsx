import { useEffect, useRef } from 'react';
import './CustomCursor.css';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // ── CUSTOM CURSOR LOGIC ──
    document.body.classList.add('custom-cursor-active');
    let mx = 0, my = 0, rx = 0, ry = 0;
    
    const onMouseMove = (e) => {
      mx = e.clientX; 
      my = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.left = mx + 'px';
        cursorRef.current.style.top = my + 'px';
      }
    };
    
    const animRing = () => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      if (ringRef.current) {
        ringRef.current.style.left = rx + 'px';
        ringRef.current.style.top = ry + 'px';
      }
      requestAnimationFrame(animRing);
    };
    
    const onMouseEnter = () => document.body.classList.add('cursor-hover');
    const onMouseLeave = () => document.body.classList.remove('cursor-hover');

    // Add listeners
    document.addEventListener('mousemove', onMouseMove);
    const ringAnimId = requestAnimationFrame(animRing);
    
    // Select all interactive elements
    const updateHoverListeners = () => {
      const hoverElements = document.querySelectorAll('a, button, input, select, textarea, .fc, .pc, .pbtn, .nlink, .ncta');
      hoverElements.forEach(el => {
        el.addEventListener('mouseenter', onMouseEnter);
        el.addEventListener('mouseleave', onMouseLeave);
      });
      return hoverElements;
    };

    let hoverElements = updateHoverListeners();

    // Use a small interval to catch dynamic elements if needed, 
    // or just rely on the fact that most are present on mount.
    const interval = setInterval(updateHoverListeners, 2000);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(ringAnimId);
      clearInterval(interval);
      hoverElements.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
      });
      document.body.classList.remove('cursor-hover');
      document.body.classList.remove('custom-cursor-active');
    };
  }, []);

  return (
    <>
      <div className="cursor" ref={cursorRef} id="cursor"></div>
      <div className="cursor-ring" ref={ringRef} id="cursorRing"></div>
    </>
  );
}
