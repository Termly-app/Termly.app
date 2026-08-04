import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getPlatformSettings } from '../data/coreStore';;
import '../pages/Landing.css';

export default function PremiumLayout({ children }) {
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
    
    // ── SCROLL REVEAL ──
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); }});
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    return () => {
      document.body.classList.remove('landing-body');
      revealObs.disconnect();
    };
  }, [children]);

  return (
    <>

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
            Termly
          </Link>
          <div className="nsep" style={{ flex: 1 }}></div>
          <Link to="/login" className="nlink">Sign in</Link>
          <Link to="/book-demo" className="ncta">
            Book a demo
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </nav>
      </div>

      <main style={{ minHeight: '60vh', background: 'var(--white)' }}>
        {children}
      </main>

      <footer className="landing-footer">
        <div className="ft-ghost">Termly</div>
        <div className="ft-grid-w">
          <div className="ft-col">
            <h4 className="ft-h">Product</h4>
            <ul className="ft-links">
              <li><Link to="/#features">Features</Link></li>
              <li><Link to="/#modules">Modules</Link></li>
              <li><Link to="/book-demo">Book a Demo</Link></li>
              <li><a href="https://github.com/shulesoft8/Termly.app/releases/download/v1.0.0/Termly.Setup.1.0.0.exe" target="_blank" rel="noopener noreferrer">Download App</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">Portals</h4>
            <ul className="ft-links">
              <li><Link to="/login">Admin Portal</Link></li>
              <li><Link to="/staff/login">Staff Portal</Link></li>
              <li><Link to="/portal/login">Parent Portal</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">Company</h4>
            <ul className="ft-links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/support">Contact Support</Link></li>
              <li><a href="mailto:shulesoft8@gmail.com">Email Us</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">Resources</h4>
            <ul className="ft-links">
              <li><Link to="/docs">Documentation</Link></li>
              <li><Link to="/faq">Help Center</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">Legal</h4>
            <ul className="ft-links">
              <li><Link to="/legal/terms">Terms of Service</Link></li>
              <li><Link to="/legal/privacy">Privacy Policy</Link></li>
              <li><Link to="/legal/cookies">Cookie Policy</Link></li>
              <li><Link to="/legal/acceptable-use">Acceptable Use</Link></li>
              <li><Link to="/legal/refunds">Refund Policy</Link></li>
              <li><Link to="/legal/service-level">Service Level (SLA)</Link></li>
            </ul>
          </div>
        </div>

        <div className="ft-ecosystem">
          <Link to="/" className="ft-logo">
            <div className="ft-sq">
              <svg viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="#fff" />
                <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.4)" />
                <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.4)" />
                <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.2)" />
              </svg>
            </div>
            <span style={{ color: '#fff' }}>Termly</span>
          </Link>
          <div className="ft-eco-links">
            <span className="ft-eco-lbl">Termly ecosystem</span>
            <Link to="/login">Admin</Link>
            <Link to="/staff/login">Staff</Link>
            <Link to="/portal/login">Parents</Link>
            <a href="https://github.com/shulesoft8/Termly.app/releases/download/v1.0.0/Termly.Setup.1.0.0.exe" target="_blank" rel="noopener noreferrer">Desktop App</a>
          </div>
        </div>

        <div className="ft-bottom">
          <div className="ft-b-links">
            <Link to="/legal/privacy">Privacy</Link>
            <span className="ft-pipe">|</span>
            <Link to="/legal/terms">License</Link>
            <span className="ft-pipe">|</span>
            <Link to="/legal/acceptable-use">Brand guidelines</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
