import { useEffect } from 'react';

const CSS = `
@keyframes saOrbit  { to { transform: rotate(360deg); } }
@keyframes saPulse  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.2);opacity:.6} }
@keyframes saPop    { from{transform:scale(.7);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes saUp     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes saFadeIn { from{opacity:0} to{opacity:1} }
@keyframes saDot    { 0%,80%,100%{transform:translateY(0);opacity:.3} 40%{transform:translateY(-4px);opacity:1} }

.sa-loader {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #0C0E0D;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  animation: saFadeIn .4s ease both;
}
.sa-loader-orbit {
  position: relative; width: 200px; height: 200px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 32px;
}
.sa-loader-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.1);
}
.sa-loader-spinner {
  position: absolute; inset: 0; border-radius: 50%;
  animation: saOrbit 2.4s linear infinite;
}
.sa-loader-spinner::before {
  content: '';
  position: absolute;
  width: 11px; height: 11px;
  background: #fff; border-radius: 50%;
  top: -5.5px; left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(255,255,255,0.5);
}
.sa-loader-glow {
  position: absolute; width: 120px; height: 120px; border-radius: 50%;
  background: radial-gradient(circle,rgba(124,92,252,0.25) 0%,rgba(124,92,252,0.08) 55%,transparent 75%);
  animation: saPulse 2.8s ease-in-out infinite;
}
.sa-loader-icon {
  position: relative; z-index: 2;
  width: 88px; height: 88px;
  background: #1C2119;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 22px;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; padding: 19px;
  animation: saPop .6s cubic-bezier(.34,1.56,.64,1) both .15s;
}
.sa-loader-sq {
  background: #354037; border-radius: 5px;
}
.sa-loader-brand {
  font-size: 20px; font-weight: 700;
  color: #D4DDD6; letter-spacing: -.4px;
  margin-bottom: 6px;
  font-family: 'Space Mono', monospace;
  animation: saUp .5s ease both .3s; opacity: 0;
  animation-fill-mode: forwards;
}
.sa-loader-sub {
  font-size: 12px; font-weight: 500;
  color: #5A6B5C; letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 36px;
  display: flex; align-items: center; gap: 7px;
  animation: saUp .5s ease both .4s; opacity: 0;
  animation-fill-mode: forwards;
}
.sa-loader-d {
  display: inline-block; width: 4px; height: 4px;
  border-radius: 50%; background: #354037; margin: 0 2px; vertical-align: middle;
}
.sa-loader-d1 { animation: saDot 1.2s ease-in-out infinite; }
.sa-loader-d2 { animation: saDot 1.2s ease-in-out .2s infinite; }
.sa-loader-d3 { animation: saDot 1.2s ease-in-out .4s infinite; }
.sa-loader-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: #111411;
  border: 1px solid rgba(124,92,252,0.2);
  border-radius: 999px; padding: 9px 20px;
  font-size: 12px; font-weight: 600; color: #ffffff;
  animation: saUp .5s ease both .5s; opacity: 0;
  animation-fill-mode: forwards;
}
.sa-loader-pdot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #0DD88A; flex-shrink: 0;
  box-shadow: 0 0 6px #0DD88A;
}
`;

export default function SuperAdminLoader({ visible = true }) {
  useEffect(() => {
    const id = 'sa-loader-css';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="sa-loader">
      <div className="sa-loader-orbit">
        <div className="sa-loader-ring" />
        <div className="sa-loader-spinner" />
        <div className="sa-loader-glow" />
        <div className="sa-loader-icon">
          <div className="sa-loader-sq" />
          <div className="sa-loader-sq" />
          <div className="sa-loader-sq" />
          <div className="sa-loader-sq" />
        </div>
      </div>

      <div className="sa-loader-brand">Termly HQ</div>

      <div className="sa-loader-sub">
        Loading
        <span>
          <span className="sa-loader-d sa-loader-d1" />
          <span className="sa-loader-d sa-loader-d2" />
          <span className="sa-loader-d sa-loader-d3" />
        </span>
      </div>

      <div className="sa-loader-pill">
        <div className="sa-loader-pdot" />
        Termly HQ · Platform Admin
      </div>
    </div>
  );
}
