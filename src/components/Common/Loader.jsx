import { useEffect } from 'react';

const CSS = (theme) => `
@keyframes ssOrbit   { to { transform: rotate(360deg); } }
@keyframes ssPulse   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.18);opacity:.7} }
@keyframes ssIconPop { from{transform:scale(.7);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes ssTxtUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes ssFadeIn  { from{opacity:0} to{opacity:1} }
@keyframes ssDot     { 0%,80%,100%{transform:translateY(0);opacity:.35} 40%{transform:translateY(-4px);opacity:1} }

.ss-loader-wrap {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: ${theme === 'dark' ? '#0C0E0D' : '#faf9ff'};
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  animation: ssFadeIn .4s ease both;
  color: ${theme === 'dark' ? '#D4DDD6' : '#1a1638'};
}
.ss-orbit {
  position: relative; width: 200px; height: 200px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 32px;
}
.ss-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid ${theme === 'dark' ? 'rgba(124,92,252,0.12)' : 'rgba(108,92,231,0.18)'};
}
.ss-spinner {
  position: absolute; inset: 0; border-radius: 50%;
  animation: ssOrbit 2.4s linear infinite;
}
.ss-spinner::before {
  content: '';
  position: absolute;
  width: 10px; height: 10px;
  background: ${theme === 'dark' ? '#ffffff' : '#4b5563'};
  border-radius: 50%;
  top: -5px; left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 12px ${theme === 'dark' ? 'rgba(124,92,252,0.4)' : 'rgba(45,31,163,0.15)'};
}
.ss-glow {
  position: absolute; width: 120px; height: 120px; border-radius: 50%;
  background: radial-gradient(circle, ${theme === 'dark' ? 'rgba(124,92,252,0.18)' : 'rgba(108,92,231,0.22)'} 0%, transparent 70%);
  animation: ssPulse 2.8s ease-in-out infinite;
}
.ss-icon {
  position: relative; z-index: 2;
  width: 84px; height: 84px;
  background: ${theme === 'dark' ? '#E6E9EF' : '#6c5ce7'}; 
  border-radius: 20px;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; padding: 18px;
  animation: ssIconPop .6s cubic-bezier(.34,1.56,.64,1) both .15s;
  box-shadow: ${theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.4)' : 'none'};
}
.ss-sq { border-radius: 4px; }
.ss-sq:nth-child(1) { background: ${theme === 'dark' ? '#0C0E0D' : '#fff'}; }
.ss-sq:nth-child(2) { background: ${theme === 'dark' ? 'rgba(12,14,13,0.5)' : 'rgba(255,255,255,0.5)'}; }
.ss-sq:nth-child(3) { background: ${theme === 'dark' ? 'rgba(12,14,13,0.5)' : 'rgba(255,255,255,0.5)'}; }
.ss-sq:nth-child(4) { background: ${theme === 'dark' ? 'rgba(12,14,13,0.2)' : 'rgba(255,255,255,0.2)'}; }

.ss-brand {
  font-size: 28px; font-weight: 700;
  color: ${theme === 'dark' ? '#fff' : '#1a1638'}; letter-spacing: -.6px;
  margin-bottom: 10px;
  animation: ssTxtUp .5s ease both .3s; opacity: 0;
  animation-fill-mode: forwards;
}
.ss-state {
  font-size: 13px; font-weight: 500;
  color: ${theme === 'dark' ? '#5B3ED4' : '#8879d0'}; letter-spacing: .03em;
  margin-bottom: 44px;
  display: flex; align-items: center; gap: 6px;
  animation: ssTxtUp .5s ease both .4s; opacity: 0;
  animation-fill-mode: forwards;
}
.ss-d {
  display: inline-block; width: 4px; height: 4px;
  border-radius: 50%; background: currentColor; margin: 0 2px; vertical-align: middle;
}
.ss-d1 { animation: ssDot 1.2s ease-in-out infinite; }
.ss-d2 { animation: ssDot 1.2s ease-in-out .2s infinite; }
.ss-d3 { animation: ssDot 1.2s ease-in-out .4s infinite; }
.ss-pill {
  display: inline-flex; align-items: center; gap: 9px;
  background: ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#efeeff'};
  border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(108,92,231,0.2)'};
  border-radius: 999px; padding: 10px 20px;
  font-size: 12px; font-weight: 500; color: ${theme === 'dark' ? '#5A6B5C' : '#4936b8'};
  animation: ssTxtUp .5s ease both .5s; opacity: 0;
  animation-fill-mode: forwards;
}
.ss-pdot {
  width: 6px; height: 6px; border-radius: 50%;
  background: ${theme === 'dark' ? '#71717a' : '#4b5563'}; flex-shrink: 0;
}
`;

export default function Loader({ visible = true, theme = 'light' }) {
  useEffect(() => {
    const id = `ss-loader-css-${theme}`;
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = CSS(theme);
      document.head.appendChild(tag);
    }
  }, [theme]);

  if (!visible) return null;

  return (
    <div className="ss-loader-wrap">
      <div className="ss-orbit">
        <div className="ss-ring" />
        <div className="ss-spinner" />
        <div className="ss-glow" />
        <div className="ss-icon">
          <div className="ss-sq" />
          <div className="ss-sq" />
          <div className="ss-sq" />
          <div className="ss-sq" />
        </div>
      </div>

      <div className="ss-brand">ShuleSoft</div>

      <div className="ss-state">
        Loading
        <span>
          <span className="ss-d ss-d1" />
          <span className="ss-d ss-d2" />
          <span className="ss-d ss-d3" />
        </span>
      </div>

      <div className="ss-pill">
        <div className="ss-pdot" />
        Built for Kenyan Schools · CBC Ready
      </div>
    </div>
  );
}
