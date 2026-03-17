import { useEffect, useRef } from 'react';
import './CustomCursor.css';

export default function CustomCursor({ disabled }) {
  const cursorRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (disabled) {
      document.body.classList.remove('custom-cursor-active');
      return;
    }

    // ── CUSTOM CURSOR LOGIC ──
    document.body.classList.add('custom-cursor-active');
    let mx = 0, my = 0, rx = 0, ry = 0;
    
    const cursor = cursorRef.current;
    const ring = ringRef.current;

    const onMouseMove = (e) => {
      const { clientX: x, clientY: y } = e;
      mx = x;
      my = y;
      if (cursor) {
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
    
    let ringAnimId;
    const animateRing = () => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      if (ring) {
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
      }
      ringAnimId = requestAnimationFrame(animateRing);
    };
    
    const onMouseEnter = () => document.body.classList.add('cursor-hover');
    const onMouseLeave = () => document.body.classList.remove('cursor-hover');

    // Add listeners
    document.addEventListener('mousemove', onMouseMove);
    animateRing(); // Start the animation loop
    
    // Select all interactive elements
    const updateHoverListeners = () => {
      const hoverElements = document.querySelectorAll('a, button, input, select, textarea, .fc, .pc, .pbtn, .nlink, .ncta, .news-btn, [role="button"]');
      hoverElements.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
        el.addEventListener('mouseenter', onMouseEnter);
        el.addEventListener('mouseleave', onMouseLeave);
      });
    };

    updateHoverListeners();

    const observer = new MutationObserver(updateHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(ringAnimId);
      observer.disconnect();
      document.body.classList.remove('cursor-hover');
      document.body.classList.remove('custom-cursor-active');
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <>
      <div className="cursor" ref={cursorRef} id="cursor"></div>
      <div className="cursor-ring" ref={ringRef} id="cursorRing"></div>
    </>
  );
}
