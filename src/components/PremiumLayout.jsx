import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getPlatformSettings } from '../data/store';
import '../pages/Landing.css';

export default function PremiumLayout({ children }) {
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function load() {
      const s = await getPlatformSettings();
      setSettings(s);
    }
    load();
  }, []);

  useEffect(() => {
    document.body.classList.add('landing-body');

    // ── CUSTOM CURSOR ──
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMouseMove = (e) => {
      mx = e.clientX; 
      my = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.left = mx + 'px';
        cursorRef.current.style.top = my + 'px';
      }
    };
    document.addEventListener('mousemove', onMouseMove);

    const animRing = () => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      if (ringRef.current) {
        ringRef.current.style.left = rx + 'px';
        ringRef.current.style.top = ry + 'px';
      }
      requestAnimationFrame(animRing);
    };
    const ringAnimId = requestAnimationFrame(animRing);

    const onMouseEnter = () => document.body.classList.add('cursor-hover');
    const onMouseLeave = () => document.body.classList.remove('cursor-hover');
    
    // Use a mutation observer or just re-run this on children change if needed
    const setupHovers = () => {
      const hoverElements = document.querySelectorAll('a, button, .fc, .pc, .pbtn, .nlink, .ncta, .news-btn');
      hoverElements.forEach(el => {
        el.addEventListener('mouseenter', onMouseEnter);
        el.addEventListener('mouseleave', onMouseLeave);
      });
    };
    setupHovers();

    // ── SCROLL REVEAL ──
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); }});
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    return () => {
      document.body.classList.remove('landing-body');
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(ringAnimId);
      revealObs.disconnect();
    };
  }, [children]);

  return (
    <>
      <div className="cursor" ref={cursorRef}></div>
      <div className="cursor-ring" ref={ringRef}></div>

      <div className="nav-wrap">
        <nav className="landing-nav">
          <Link to="/" className="nav-logo">
            <div className="nav-sq">
              <svg viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white"/>
                <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.5)"/>
                <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.5)"/>
                <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.2)"/>
              </svg>
            </div>
            ShuleSoft
          </Link>
          <div className="nsep" style={{ flex: 1 }}></div>
          <Link to="/login" className="nlink">Sign in</Link>
          <Link to="/register" className="ncta">
            Get access
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </nav>
      </div>

      <main style={{ minHeight: '60vh', background: 'var(--white)' }}>
        {children}
      </main>

      <footer className="landing-footer">
        <div className="ft-ghost">ShuleSoft</div>
        <div className="ft-grid-w">
          <div className="ft-col">
            <Link to="/" className="ft-logo">
              <div className="ft-sq">
                <svg viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="#0D0D0D"/>
                  <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="rgba(13,13,13,.4)"/>
                  <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(13,13,13,.4)"/>
                  <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(13,13,13,.2)"/>
                </svg>
              </div>
              ShuleSoft
            </Link>
            <p className="ft-tag">The School Management System for modern Kenya. Built for the future of Kenyan Edu</p>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">System</h4>
            <ul className="ft-links">
              <li><Link to="/legal/terms">Terms of Service</Link></li>
              <li><Link to="/legal/privacy">Privacy Policy</Link></li>
              <li><Link to="/legal/acceptable-use">Acceptable Use</Link></li>
              <li><Link to="/legal/refunds">Refund Policy</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">Support</h4>
            <ul className="ft-links">
              <li><Link to="/support">Contact Support</Link></li>
              <li><a href={`tel:${settings?.support?.phone || '+254712260057'}`}>Call: {settings?.support?.phone || '+254712260057'}</a></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/legal/service-level">Service Level (SLA)</Link></li>
              <li><a href="#">System Status</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">Kaulani Corp</h4>
            <ul className="ft-links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/security-trust">Security & Trust</Link></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div className="ft-col ft-col-news">
            <h4 className="ft-h">Stay Updated</h4>
            <p className="ft-news-p">Get the latest on Kenyan educational tech.</p>
            <div className="newsletter-box">
              <input type="email" placeholder="Email Address" className="news-input" />
              <button className="news-btn">Join</button>
            </div>
          </div>
        </div>
        <div className="ft-bottom">
          <span className="ft-copy">© 2025 Kaulani Corp · Made in Nairobi, Kenya 🇰🇪</span>
          <div className="ft-b-links">
             <span>All rights reserved.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
