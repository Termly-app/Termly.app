import React, { useState, useRef } from 'react';
import { LogoMark } from './CommonIcons';

/**
 * Dynamic Interactive 3D Logo Component
 * Performs real-time CSS 3D perspective tilt and ambient glare tracking.
 */
export default function Logo3D({ size = 48, interactive = true, className = '' }) {
  const [transform, setTransform] = useState('perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glare, setGlare] = useState({ opacity: 0, x: 50, y: 50 });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -16; // Max 16 deg tilt
    const rotateY = ((x - centerX) / centerX) * 16;

    setTransform(`perspective(600px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.05, 1.05, 1.05)`);
    setGlare({
      opacity: 0.35,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setTransform('perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlare({ opacity: 0, x: 50, y: 50 });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`logo-3d-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        transformStyle: 'preserve-3d',
        transform,
        transition: 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1), filter 0.2s ease',
        userSelect: 'none'
      }}
    >
      {/* Ambient Radial Backlight Glow */}
      <div 
        style={{
          position: 'absolute',
          width: `${size * 1.4}px`,
          height: `${size * 1.4}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(79,70,229,0.15) 50%, rgba(0,0,0,0) 70%)',
          filter: 'blur(10px)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {/* 3D Vector Emblem */}
      <div style={{ position: 'relative', zIndex: 1, transform: 'translateZ(10px)' }}>
        <LogoMark size={size} />
      </div>

      {/* Dynamic Specular Lighting Layer */}
      {interactive && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '24%',
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)`,
            opacity: glare.opacity,
            transition: 'opacity 0.2s ease',
            zIndex: 2,
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
}
