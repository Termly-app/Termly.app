import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getPlatformSettings } from '../data/store';
import { getPlanDisplayFeatures } from './SuperAdmin/superAdminUtils';
import './Landing.css';
import {
  BookIcon, UserIcon, CheckIcon, CardIcon, SchoolIcon,
  PhoneIcon, DashboardIcon, CalendarIcon, FlagIcon, RocketIcon,
  GraduationIcon, ChevronDownIcon
} from '../components/CommonIcons';
import { Helmet } from 'react-helmet-async';

export default function Landing() {
  const ringFillRef = useRef(null);
  const barsRef = useRef(null);
  const [settings, setSettings] = useState(null);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const s = await getPlatformSettings();
      setSettings(s);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    // Add class to body for specific styles
    document.body.classList.add('landing-body');

    // ── PARALLAX ON FLOATERS ──
    const onMouseMoveParallax = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      document.querySelectorAll('.floater').forEach((fl, i) => {
        const d = (i % 3 + 1) * 8;
        fl.style.transform = `translate(${dx * d}px, ${dy * d}px)`;
      });
    };
    document.addEventListener('mousemove', onMouseMoveParallax);

    // ── CARD TILT ON HOVER ──
    const onMouseMoveTilt = (e, card) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const cx = r.width / 2;
      const cy = r.height / 2;
      const tiltX = ((y - cy) / cy) * 4;
      const tiltY = ((x - cx) / cx) * -4;
      card.style.transform = `translateY(-6px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      card.style.transition = 'transform .1s';
    };
    const onMouseLeaveTilt = (card) => {
      card.style.transform = '';
      card.style.transition = 'transform .35s cubic-bezier(.16,1,.3,1)';
    };

    // ── SMOOTH ACTIVE NAV LINK ──
    const onScroll = () => {
      const sections = document.querySelectorAll('section[id], div[id]');
      const navLinks = document.querySelectorAll('.nlink');
      let current = '';
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 200) current = s.id;
      });
      navLinks.forEach(l => {
        l.style.color = l.getAttribute('href') === '#' + current ? 'var(--ink)' : '';
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── DROP-AWAY DROPDOWN ──
    const handleClickOutside = (e) => {
      if (showLoginDropdown && !e.target.closest('.nav-dropdown-w')) {
        setShowLoginDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.body.classList.remove('landing-body');
      document.removeEventListener('mousemove', onMouseMoveParallax);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLoginDropdown]);

  useEffect(() => {
    // ── SCROLL REVEAL ──
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
    }, { threshold: 0.12 });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => revealObs.observe(el));

    // ── COUNTER ANIMATION ──
    function animateCount(el, target, isPercent, isDec, duration) {
      const step = 16;
      const steps = duration / step;
      const increment = target / steps;
      let current = 0;
      const itimer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(itimer);
        }
        if (isDec) el.textContent = current.toFixed(1);
        else if (isPercent) el.textContent = Math.round(current) + '%';
        else el.textContent = Math.round(current);
      }, step);
    }

    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const val = el.dataset.count;
        const valPct = el.dataset.countPct;
        const valDec = el.dataset.countDec;
        if (val) animateCount(el, parseFloat(val), false, false, 1400);
        if (valPct) animateCount(el, parseFloat(valPct), true, false, 1200);
        if (valDec) animateCount(el, parseFloat(valDec), false, true, 1200);
        counterObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count],[data-count-pct],[data-count-dec]').forEach(el => counterObs.observe(el));

    // ── HERO BAR CHART ANIMATION ──
    const barObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.bar[data-h]').forEach((bar, i) => {
          setTimeout(() => {
            bar.style.height = bar.dataset.h + '%';
          }, i * 80);
        });
        barObs.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.bars').forEach(el => barObs.observe(el));

    // ── RING ANIMATION ──
    const ringObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const fill = e.target.querySelector('.rfill');
        if (fill) fill.classList.add('animate');
        ringObs.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.ring-svg').forEach(el => ringObs.observe(el));

    // ── CARD TILT ON HOVER (init for dynamic cards) ──
    const onMouseMoveTilt = (e, card) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const cx = r.width / 2;
      const cy = r.height / 2;
      card.style.transform = `translateY(-6px) rotateX(${((y - cy) / cy) * 4}deg) rotateY(${((x - cx) / cx) * -4}deg)`;
    };
    const onMouseLeaveTilt = (card) => {
      card.style.transform = '';
    };

    document.querySelectorAll('.fc, .pc').forEach(card => {
      card.onmousemove = (e) => onMouseMoveTilt(e, card);
      card.onmouseleave = () => onMouseLeaveTilt(card);
    });

    // Fallback: manually reveal pricing after a delay
    const fallbackTimer = setTimeout(() => {
      revealElements.forEach(el => el.classList.add('visible'));
    }, 4000);

    return () => {
      revealObs.disconnect();
      counterObs.disconnect();
      barObs.disconnect();
      ringObs.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [settings]);

  return (
    <>
      <Helmet>
        <title>ShuleSoft — High Performance CBC School Management System</title>
        <meta name="description" content="Kenya's #1 CBC-compliant school management system. Manage finances, learner portfolios, and generate KNEC-standard reports instantly." />
        <meta name="keywords" content="ShuleSoft, School Management System Kenya, CBC Grading, School ERP, Student Information System" />
      </Helmet>
      <div className="nav-wrap">
        <nav className="landing-nav">
          <Link to="/" className="nav-logo">
            <div className="nav-sq">
              <svg viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white" />
                <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.55)" />
                <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.55)" />
                <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.25)" />
              </svg>
            </div>
            ShuleSoft
          </Link>
          <a href="#features" className="nlink">Features</a>
          <Link to="/contact" className="nlink">Contact</Link>
          <div className="nsep"></div>
          
          <div className="nav-dropdown-w" style={{ position: 'relative' }}>
            <button 
              className={`nlink n-login ${showLoginDropdown ? 'active' : ''}`}
              onClick={() => setShowLoginDropdown(!showLoginDropdown)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Sign in
              <ChevronDownIcon size={12} style={{ transform: showLoginDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
            
            {showLoginDropdown && (
              <div className="portal-dropdown animate-pop">
                <Link to="/login" className="pd-item" onClick={() => setShowLoginDropdown(false)}>
                  <div className="pd-i si-v"><SchoolIcon size={14} /></div>
                  <div className="pd-t">
                    <strong>School Management</strong>
                    <span>For Admins & Bursars</span>
                  </div>
                </Link>
                <Link to="/staff/login" className="pd-item" onClick={() => setShowLoginDropdown(false)}>
                  <div className="pd-i si-g"><UserIcon size={14} /></div>
                  <div className="pd-t">
                    <strong>Staff Portal</strong>
                    <span>For Teachers & Staff</span>
                  </div>
                </Link>
                {/* <Link to="/portal/login" className="pd-item" onClick={() => setShowLoginDropdown(false)}>
                  <div className="pd-i si-y"><GraduationIcon size={14} /></div>
                  <div className="pd-t">
                    <strong>Parent Portal</strong>
                    <span>For Results & Fees</span>
                  </div>
                </Link> */}
              </div>
            )}
          </div>

          <Link to="/register" className="ncta">
            Get access
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </nav>
      </div>

      <section className="hero">
        <div className="ghost ghost-hero">ShuleSoft</div>

        <div className="floaters">
          <div className="floater fl-1"><BookIcon size={24} /></div>
          <div className="floater fl-2"><UserIcon size={24} /></div>
          <div className="floater fl-3"><CheckIcon size={24} /></div>
          <div className="floater fl-4"><CardIcon size={24} /></div>
          <div className="floater fl-5"><SchoolIcon size={28} /></div>
          <div className="floater fl-6"><PhoneIcon size={24} /></div>
        </div>

        <div className="hero-icon">
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <rect x="4" y="4" width="13" height="13" rx="3" fill="white" />
            <rect x="21" y="4" width="13" height="13" rx="3" fill="rgba(255,255,255,.55)" />
            <rect x="4" y="21" width="13" height="13" rx="3" fill="rgba(255,255,255,.55)" />
            <rect x="21" y="21" width="13" height="13" rx="3" fill="rgba(255,255,255,.25)" />
          </svg>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="bdot"></span>
            Built for Kenyan Schools · CBC & 8-4-4 Ready
          </div>
          <h1 className="hero-h1">Complete School Management<br /><span className="h1-dim">— Exams, Finance, Compliance —</span><br />all in one system.</h1>
          <p className="hero-sub">ShuleSoft is the all-in-one ecosystem for modern Kenyan schools. Automate your M-PESA fee collection, manage formal exam sessions with auto-ranking, and ensure 100% NEMIS compliance.</p>
          <div className="hero-btns">
            <Link to="/register" className="btn-p">
              Get access
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5h10M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>

        <div className="hero-screen">
          <div className="hs-frame">
            <div className="hs-bar">
              <div className="tls"><div className="tl tl-r"></div><div className="tl tl-y"></div><div className="tl tl-g"></div></div>
              <div className="hs-url">shulesoft-app.vercel.app / dashboard</div>
              <div style={{ width: 60 }}></div>
            </div>
            <div className="hs-body">
              <div className="hs-side">
                <div className="hs-side-logo"><div className="hs-side-sq"><svg viewBox="0 0 13 13" fill="none" width="10" height="10"><rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white" /><rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="white" /><rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="white" /><rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="white" /></svg></div>ShuleSoft</div>
                <div className="sl on"><span className="sl-ico si-v"><DashboardIcon size={12} /></span>Dashboard</div>
                <div className="sl"><span className="sl-ico si-g"><UserIcon size={12} /></span>Students</div>
                <div className="sl"><span className="sl-ico si-g"><CardIcon size={12} /></span>Fees</div>
                <div className="sl"><span className="sl-ico si-g"><GraduationIcon size={12} /></span>Exams</div>
                <div className="sl"><span className="sl-ico si-g"><FlagIcon size={12} /></span>NEMIS Audit</div>
                <div className="sl"><span className="sl-ico si-g"><BookIcon size={12} /></span>Library</div>
              </div>
              <div className="hs-main">
                <div className="hs-t">Greenfield Academy</div>
                <div className="hs-s">Term 2, 2025 — Week 8 of 14</div>
                <div className="kpis">
                  <div className="kpi"><div className="kl">Students</div><div className="kv" data-count="842">0</div><div className="kc ku">↑ +12</div></div>
                  <div className="kpi"><div className="kl">Attendance</div><div className="kv" data-count-pct="94.2">0</div><div className="kc ku">↑ on target</div></div>
                  <div className="kpi"><div className="kl">Fee Collect.</div><div className="kv" data-count-pct="87">0</div><div className="kc kd">↓ gap</div></div>
                  <div className="kpi"><div className="kl">Avg Score</div><div className="kv" data-count-dec="71.4">0</div><div className="kc ku">↑ +3.2</div></div>
                </div>
                <div className="dg">
                  <div className="dp">
                    <div className="dpt">Enrolment 2025</div>
                    <div className="bars" ref={barsRef}>
                      <div className="bar" data-h="52" style={{ background: '#E8E8E5', height: '0%' }}></div>
                      <div className="bar" data-h="64" style={{ background: '#E0DDF8', height: '0%' }}></div>
                      <div className="bar" data-h="58" style={{ background: '#E8E8E5', height: '0%' }}></div>
                      <div className="bar" data-h="76" style={{ background: '#CCC2FF', height: '0%' }}></div>
                      <div className="bar" data-h="70" style={{ background: '#E8E8E5', height: '0%' }}></div>
                      <div className="bar" data-h="84" style={{ background: '#B8A9FF', height: '0%' }}></div>
                      <div className="bar" data-h="97" style={{ background: '#6B4EFF', height: '0%' }}></div>
                    </div>
                    <div className="blbls"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div>
                  </div>
                  <div className="dp">
                    <div className="dpt">Activity</div>
                    <div className="acts">
                      <div className="act"><span className="an">Form 4 Mock</span><span className="tag tg">Exam Open</span></div>
                      <div className="act"><span className="an">NEMIS Sync</span><span className="tag tv">94% Ready</span></div>
                      <div className="act"><span className="an">Library</span><span className="tag ty">12 Overdue</span></div>
                      <div className="act"><span className="an">M-PESA STK</span><span className="tag tr">Alert</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-track">
          <span className="ti on"><span className="tic tv-"><BookIcon size={14} /></span>CBC Portfolios</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic tg-"><CardIcon size={14} /></span>M-PESA Fees</span><span className="tick-dot">·</span>
          <span className="ti on"><span className="tic ty-"><GraduationIcon size={14} /></span>Formal Exams</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic tv-"><FlagIcon size={14} /></span>NEMIS Compliance</span><span className="tick-dot">·</span>
          <span className="ti on"><span className="tic tg-"><BookIcon size={14} /></span>Smart Library</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic ty-"><RocketIcon size={14} /></span>E-Learning LMS</span><span className="tick-dot">·</span>
          <span className="ti on"><span className="tic tv-"><SchoolIcon size={14} /></span>Multi-Campus</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic tg-"><FlagIcon size={14} /></span>Built in Nairobi</span><span className="tick-dot">·</span>
          <span className="ti on"><span className="tic tv-"><BookIcon size={14} /></span>CBC Portfolios</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic tg-"><CardIcon size={14} /></span>M-PESA Fees</span><span className="tick-dot">·</span>
          <span className="ti on"><span className="tic ty-"><DashboardIcon size={14} /></span>KNEC Report Cards</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic tv-"><CalendarIcon size={14} /></span>Student Analytics</span><span className="tick-dot">·</span>
          <span className="ti on"><span className="tic tg-"><UserIcon size={14} /></span>Staff Records</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic ty-"><RocketIcon size={14} /></span>Exam Analytics</span><span className="tick-dot">·</span>
          <span className="ti on"><span className="tic tv-"><SchoolIcon size={14} /></span>Multi-Campus</span><span className="tick-dot">·</span>
          <span className="ti"><span className="tic tg-"><FlagIcon size={14} /></span>Built in Nairobi</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="sc reveal"><div className="sn"><span className="sn-num" data-count="5">0</span><sup>+</sup></div><div className="sl-">Schools onboarded and growing</div></div>
        <div className="sc reveal reveal-delay-1"><div className="sn"><span className="sn-num" data-count="12">0</span></div><div className="sl-">Modules built for Kenyan schools</div></div>
        <div className="sc reveal reveal-delay-2"><div className="sn"><span className="sn-num" data-count="99">0</span><sup>%</sup></div><div className="sl-">Uptime SLA guaranteed</div></div>
        <div className="sc reveal reveal-delay-3"><div className="sn"><span className="sn-num" data-count="2">0</span></div><div className="sl-">Curricula supported (CBC & 8-4-4)</div></div>
      </div>

      <section className="section" id="features">
        <div className="sec-head reveal">
          <div className="eyebrow">Platform capabilities</div>
          <h2 className="landing-h2">Built for everyone<br />in your school.</h2>
          <p className="sec-p">Purpose-built for the Kenyan CBC curriculum, M-PESA ecosystem, and the real people who run schools every day.</p>
        </div>

        <div className="feat-grid">
          <div className="fc reveal">
            <div className="fc-role">For Principals</div>
            <div className="fc-vis">
              <div className="mini" style={{ width: '100%' }}>
                <div className="mh"><span className="mt">Dashboard</span><span className="mb- " style={{ background: '#6B4EFF', color: '#fff' }}>Live</span></div>
                <div className="mr"><span className="mn">Enrolment</span><span className="mv">842 students</span></div>
                <div className="mr"><span className="mn">Attendance</span><span style={{ color: '#16A34A', fontWeight: 500 }}>94.2% ↑</span></div>
                <div className="mr"><span className="mn">Fee collection</span><span style={{ color: '#DC2626', fontWeight: 500 }}>87% ↓</span></div>
                <div className="mr"><span className="mn">Avg. score</span><span className="mv">71.4 pts</span></div>
              </div>
            </div>
            <div className="fc-title">School & Staff Management</div>
            <p className="fc-desc">Complete student profiles, secure staff records, and full institution oversight. Everything you need to manage your school from a single, cloud-based dashboard.</p>
          </div>

          <div className="fc reveal reveal-delay-1">
            <div className="fc-role">For Bursars</div>
            <div className="fc-vis">
              <div className="mini" style={{ width: '100%' }}>
                <div className="mh"><span className="mt">Fee Collection</span><span className="mb-" style={{ background: '#16A34A', color: '#fff' }}>M-PESA</span></div>
                <div className="mr"><span className="mn">Kamau J.</span><span className="mtag" style={{ background: '#DCFCE7', color: '#15803D' }}>Paid</span></div>
                <div className="mr"><span className="mn">Wanjiku A.</span><span className="mtag" style={{ background: '#DCFCE7', color: '#15803D' }}>Paid</span></div>
                <div className="mr"><span className="mn">Omondi B.</span><span className="mtag" style={{ background: '#FEF9C3', color: '#854D0E' }}>Partial</span></div>
                <div className="mr"><span className="mn">Njeri P.</span><span className="mtag" style={{ background: '#FEE2E2', color: '#B91C1C' }}>Pending</span></div>
              </div>
            </div>
            <div className="fc-title">Smart Fee Tracking</div>
            <p className="fc-desc">Keep your school's finances in check. Professional receipts, instant balance tracking, and detailed financial reports for every term.</p>
          </div>

          <div className="fc reveal reveal-delay-2">
            <div className="fc-role">For Teachers</div>
            <div className="fc-vis">
              <div className="mini" style={{ width: '100%' }}>
                <div className="mh"><span className="mt">Exam Results</span><span className="mb-" style={{ background: '#6B4EFF', color: '#fff' }}>Term 2</span></div>
                <div className="mbars">
                  <div className="mb_" style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#E8E8E5', height: '60%' }}></div>
                  <div className="mb_" style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#E0DDF8', height: '80%' }}></div>
                  <div className="mb_" style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#E8E8E5', height: '50%' }}></div>
                  <div className="mb_" style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#E0DDF8', height: '92%' }}></div>
                  <div className="mb_" style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#E8E8E5', height: '70%' }}></div>
                  <div className="mb_" style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#6B4EFF', height: '100%' }}></div>
                  <div className="mb_" style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#E8E8E5', height: '65%' }}></div>
                </div>
                <div className="mr" style={{ marginTop: 8 }}><span className="mn">Class avg</span><span className="mv">71.4 / 100</span></div>
                <div className="mr"><span className="mn">Top scorer</span><span style={{ color: '#6B4EFF', fontWeight: 500 }}>Achieng — 96</span></div>
              </div>
            </div>
            <div className="fc-title">CBC, 8-4-4 & IGCSE Ready</div>
            <p className="fc-desc">Record CATs, Mid-Term, and End-Term marks. Generate CBC learner portfolios and KNEC-standard report cards with a single click. Compliant with all Kenyan curricula.</p>
          </div>
        </div>

        <div className="feat-grid-2" style={{ marginTop: 18 }}>
          <div className="fc reveal">
            <div className="fc-role">For Administrators</div>
            <div className="fc-vis">
              <div className="ring-w" style={{ width: '100%', padding: 8 }}>
                <div className="ring-svg">
                  <svg width="54" height="54" viewBox="0 0 54 54">
                    <circle className="rbg" cx="27" cy="27" r="21" />
                    <circle className="rfill" cx="27" cy="27" r="21" />
                  </svg>
                  <div className="ring-lbl">94%</div>
                </div>
                <div className="ring-info">
                  <strong>Daily Attendance</strong>
                  792 of 842 present<br />
                  <span style={{ color: '#16A34A', fontWeight: 500, fontSize: '.65rem' }}>94% attendance rate</span>
                </div>
              </div>
            </div>
            <div className="fc-title">Staff & NEMIS Export</div>
            <p className="fc-desc">Replace paper registers with cloud-based attendance. Export your school data to NEMIS format seamlessly, saving hours of manual data entry.</p>
          </div>

          <div className="fc fc-dark reveal reveal-delay-2">
            <div className="fc-vis" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.08)' }}>
              <div className="mini" style={{ width: '100%', color: 'rgba(255,255,255,.85)' }}>
                <div className="mh" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
                  <span style={{ fontWeight: 700, fontSize: '.7rem', color: '#fff' }}>Exam Analytics</span>
                  <span className="mb-" style={{ background: '#6B4EFF', color: '#fff' }}>CBC</span>
                </div>
                <div className="mr" style={{ borderColor: 'rgba(255,255,255,.07)' }}><span style={{ color: 'rgba(255,255,255,.45)' }}>Mathematics</span><span style={{ color: '#A3E635', fontWeight: 500 }}>72.4 ↑</span></div>
                <div className="mr" style={{ borderColor: 'rgba(255,255,255,.07)' }}><span style={{ color: 'rgba(255,255,255,.45)' }}>English</span><span style={{ color: '#A3E635', fontWeight: 500 }}>68.1 ↑</span></div>
                <div className="mr" style={{ border: 'none' }}><span style={{ color: 'rgba(255,255,255,.45)' }}>Science</span><span style={{ color: '#FCA5A5', fontWeight: 500 }}>61.2 ↓</span></div>
              </div>
            </div>
            <div className="fc-title">Exam Analytics</div>
            <p className="fc-desc">Per-subject averages, class rankings, improvement trends — all auto-calculated and visualised live.</p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 11px', borderRadius: 100, background: 'rgba(107,78,255,.2)', border: '1px solid rgba(107,78,255,.3)', fontSize: '.65rem', color: '#C4B5FF', fontWeight: 500 }}>Per Subject</span>
              <span style={{ padding: '3px 11px', borderRadius: 100, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', fontSize: '.65rem', color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>Class Rank</span>
              <span style={{ padding: '3px 11px', borderRadius: 100, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', fontSize: '.65rem', color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>Trends</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="modules" style={{ background: '#fafafa' }}>
        <div className="sec-head reveal">
          <div className="eyebrow">Modules & Features</div>
          <h2 className="landing-h2">Everything your school needs.</h2>
          <p className="sec-p">Mix and match the exact features your school needs. No rigid plans, just full flexibility.</p>
        </div>
        <div className="reveal" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, padding: '0 24px' }}>
          
          <div className="fc" style={{ background: '#fff' }}>
            <div className="fc-role" style={{ color: '#4F46E5', background: '#E0E7FF' }}>Academic</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0 0' }}>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><GraduationIcon size={18} color="#64748b"/> <strong>Exam Results:</strong> 8-4-4 & automated ranking</li>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><BookIcon size={18} color="#64748b"/> <strong>CBC Tracking:</strong> Core competencies & rubrics</li>
              <li style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}><CheckIcon size={18} color="#64748b"/> <strong>Report Cards:</strong> Instant KNEC-standard generation</li>
            </ul>
          </div>

          <div className="fc" style={{ background: '#fff' }}>
            <div className="fc-role" style={{ color: '#16A34A', background: '#DCFCE7' }}>Finance</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0 0' }}>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><CardIcon size={18} color="#64748b"/> <strong>Fee Collection:</strong> Fully automated M-PESA sync</li>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><CalendarIcon size={18} color="#64748b"/> <strong>Expense tracking:</strong> Daily institutional ledger</li>
              <li style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}><UserIcon size={18} color="#64748b"/> <strong>Payroll:</strong> Staff salary & deductions</li>
            </ul>
          </div>

          <div className="fc" style={{ background: '#fff' }}>
            <div className="fc-role" style={{ color: '#EA580C', background: '#FFEDD5' }}>Communication</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0 0' }}>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><PhoneIcon size={18} color="#64748b"/> <strong>SMS Blasts:</strong> Instant mass parent alerts</li>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><FlagIcon size={18} color="#64748b"/> <strong>Auto-statements:</strong> Email fee balances</li>
              <li style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}><SchoolIcon size={18} color="#64748b"/> <strong>Announcements:</strong> Internal staff messaging</li>
            </ul>
          </div>

          <div className="fc" style={{ background: '#fff' }}>
            <div className="fc-role" style={{ color: '#9333EA', background: '#F3E8FF' }}>Administration</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0 0' }}>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><CheckIcon size={18} color="#64748b"/> <strong>NEMIS Compliance:</strong> Standardized reporting</li>
              <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}><RocketIcon size={18} color="#64748b"/> <strong>Role Security:</strong> Granular access permissions</li>
              <li style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}><SchoolIcon size={18} color="#64748b"/> <strong>Multi-Campus:</strong> Manage multiple branches</li>
            </ul>
          </div>

        </div>
      </section>

      <section className="section portals-gateway" id="portals">
        <div className="sec-head reveal">
          <div className="eyebrow">Portal Gateway</div>
          <h2 className="landing-h2">One platform,<br />tailored experiences.</h2>
          <p className="sec-p">Whether you're managing a whole campus, recording class grades, or checking a student's fees, we have a portal built for you.</p>
        </div>

        <div className="portal-cards">
          <div className="pcard reveal">
            <div className="pcard-icon si-v"><SchoolIcon size={24} /></div>
            <h3>School Management</h3>
            <p>Complete institution oversight, finance management, and platform configuration for administrators.</p>
            <Link to="/login" className="pcard-link">Open Admin Portal <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
          </div>

          <div className="pcard reveal reveal-delay-1">
            <div className="pcard-icon si-g"><UserIcon size={24} /></div>
            <h3>Staff Portal</h3>
            <p>Optimized for mobile use. Teachers can record marks, take attendance, and manage class lessons on the go.</p>
            <Link to="/staff/login" className="pcard-link">Open Staff Portal <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
          </div>

          {/* <div className="pcard reveal reveal-delay-2">
            <div className="pcard-icon si-y"><GraduationIcon size={24} /></div>
            <h3>Parent Portal</h3>
            <p>Access learner results, check outstanding balances, and view school announcements in real-time.</p>
            <Link to="/portal/login" className="pcard-link">Open Parent Portal <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
          </div> */}
        </div>
      </section>

      <section className="cta">
        <div className="cta-ghost">Kenya</div>
        <div className="cta-in reveal">
          <div className="eyebrow" style={{ margin: '0 auto 24px' }}>Get started today</div>
          <h2 className="landing-h2">Your school,<br />finally organised.</h2>
          <p>Join a growing community of Kenyan schools that replaced spreadsheets,<br />paper registers, and group chats with ShuleSoft.</p>
          <div className="cta-btns">
            <Link to="/register" className="btn-p" style={{ padding: '16px 38px', borderRadius: 100, fontSize: '1rem' }}>
              Get access now
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5h10M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link to="/support" className="btn-s" style={{ padding: '16px 38px', borderRadius: 100, fontSize: '1rem' }}>Contact support</Link>
          </div>
          <div className="cta-note">No setup fees · No contracts · Cancel anytime</div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="ft-ghost">ShuleSoft</div>
        <div className="ft-grid-w">
          <div className="ft-col">
            <Link to="/" className="ft-logo">
              <div className="ft-sq">
                <svg viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="#0D0D0D" />
                  <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="rgba(13,13,13,.4)" />
                  <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(13,13,13,.4)" />
                  <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(13,13,13,.2)" />
                </svg>
              </div>
              ShuleSoft
            </Link>
            <p className="ft-tag">The School Management System for modern Kenya. Built for the future of Kenyan education.</p>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">System</h4>
            <ul className="ft-links">
              {/* <li><Link to="/docs">Documentation</Link></li> */}
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
              <li><a href="mailto:shulesoft8@gmail.com">Email: shulesoft8@gmail.com</a></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/legal/service-level">Service Level (SLA)</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4 className="ft-h">ShuleSoft HQ</h4>
            <ul className="ft-links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/legal/privacy">Privacy Policy</Link></li>
              <li><Link to="/legal/terms">Terms of Service</Link></li>
            </ul>
          </div>

        </div>
        <div className="ft-bottom">
          <span className="ft-copy">© 2025 ShuleSoft</span>
          <div className="ft-b-links">
            <span>All rights reserved.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
