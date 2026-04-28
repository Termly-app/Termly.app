import { useState, useEffect } from 'react';
import PremiumLayout from '../components/PremiumLayout';
import { getPlatformSettings } from '../data/store';
import { 
  RocketIcon, GraduationIcon, EditIcon, CardIcon, ShieldIcon, SettingsIcon 
} from '../components/CommonIcons';
import { Helmet } from 'react-helmet-async';

export default function Docs() {
  const [activeSec, setActiveSec] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: <RocketIcon size={18} /> },
    { id: 'students', title: 'Student Management', icon: <GraduationIcon size={18} /> },
    { id: 'academics', title: 'Academic Records', icon: <EditIcon size={18} /> },
    { id: 'fees', title: 'Fees & Finance', icon: <CardIcon size={18} /> },
    { id: 'security', title: 'Security & RLS', icon: <ShieldIcon size={18} /> }
  ];

  return (
    <PremiumLayout>
      <Helmet>
        <title>Documentation | Termly — How It Works</title>
        <meta name="description" content="Comprehensive documentation for Termly school management system. Learn about student management, CBC grading, fees, and security." />
        <link rel="canonical" href="https://Termly.com/docs" />
      </Helmet>
      <section className="section" style={{ minHeight: '100vh', paddingTop: '120px' }}>
        <div className="sec-head reveal">
          <div className="eyebrow">Documentation</div>
          <h2 className="landing-h2">How Termly Works</h2>
          <p className="sec-p">Everything you need to know about managing your school with Termly.</p>
        </div>

        <div className="docs-container" style={{ 
          display: 'grid', 
          gridTemplateColumns: '280px 1fr', 
          gap: '40px', 
          maxWidth: '1200px', 
          margin: '60px auto',
          padding: '0 20px'
        }}>
          {/* SIDE NAV */}
          <aside className="docs-nav" style={{ 
            position: 'sticky', 
            top: '120px', 
            height: 'fit-content',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            padding: '12px',
            border: '1px solid var(--border)'
          }}>
            {sections.map(s => (
              <button 
                key={s.id} 
                className={`docs-nav-item ${activeSec === s.id ? 'active' : ''}`}
                onClick={() => {
                   setActiveSec(s.id);
                   window.scrollTo({ top: 200, behavior: 'smooth' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: activeSec === s.id ? 'var(--primary-light)' : 'transparent',
                  color: activeSec === s.id ? 'var(--primary)' : 'var(--text-muted)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: activeSec === s.id ? 700 : 500,
                  transition: 'all .2s'
                }}
              >
                <span>{s.icon}</span>
                {s.title}
              </button>
            ))}
          </aside>

          {/* CONTENT */}
          <main className="docs-content" style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '24px', 
            padding: '48px',
            border: '1px solid var(--border)',
            minHeight: '600px'
          }}>
            {activeSec === 'getting-started' && (
              <article>
                <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>Getting Started</h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
                  Termly is a cloud-based school management system designed specifically for the Kenyan context. 
                  To get started, register your school on the platform and choose a subscription plan that fits your student population.
                </p>
                <h3 style={{ marginTop: '32px' }}>1. Registration</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Use your official school email to sign up. This email will serve as your primary **School Admin** account. 
                  After registration, you will receive an activation link to verify your institution.
                </p>
                <h3 style={{ marginTop: '32px' }}>2. Selection of Plans</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  We offer three tiers: **Starter** (Up to 100 students), **Pro** (Up to 500 students), and **Elite** (Unlimited). 
                  Each plan includes CBC grading and M-PESA integration.
                </p>
              </article>
            )}

            {activeSec === 'students' && (
              <article>
                <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>Student Management</h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
                  Our student module provides a digital directory for every learner in your institution.
                </p>
                <h3 style={{ marginTop: '32px' }}>Adding Students</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Navigate to the **Students** tab. You can add students individually by providing their name, 
                  admission number, grade, and stream. The system automatically tracks enrolment against your plan limits.
                </p>
                <h3 style={{ marginTop: '32px' }}>Profile Tracking</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Each student has a persistent profile where academic history, fee payments, and attendance are recorded centrally.
                </p>
              </article>
            )}

            {activeSec === 'academics' && (
              <article>
                <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>Academic Records (CBC)</h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
                  Termly is engineered for the **Competency Based Curriculum**.
                </p>
                <h3 style={{ marginTop: '32px' }}>Grading & Evaluations</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Teachers can input marks for specific subjects per term. The system calculates averages and ranks automatically. 
                  For CBC, we provide specialized assessment sheets for Core Competencies.
                </p>
                <h3 style={{ marginTop: '32px' }}>Report Cards</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Generate professional, print-ready report cards aligned with KNEC standards. 
                  No manual calculation or spreadsheet linking required.
                </p>
              </article>
            )}

            {activeSec === 'fees' && (
              <article>
                <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>Fees & Finance</h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
                  Automate your school's financial health with M-PESA integration.
                </p>
                <h3 style={{ marginTop: '32px' }}>Recording Payments</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  When a parent pays via M-PESA, simply enter the transaction code in the **Fees** module. 
                  Termly generates a digital receipt and updates the student's balance instantly.
                </p>
                <h3 style={{ marginTop: '32px' }}>Financial KPIs</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Track expected revenue vs. actual collection in real-time. Identify outstanding balances 
                  and generate payment reminders easily.
                </p>
              </article>
            )}

            {activeSec === 'security' && (
              <article>
                <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>Security & Row Level Security (RLS)</h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
                  Termly uses an elite security model to ensure your school's data remains private and secure.
                </p>
                <h3 style={{ marginTop: '32px' }}>Data Isolation</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Your data is protected by **Row-Level Security (RLS)** at the database layer. 
                  This ensures that users from Greenfield Academy can never see or access data from Alliance High School, 
                  even if they share the same platform.
                </p>
                <h3 style={{ marginTop: '32px' }}>Role-Based Access</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Admins have full oversight, while Teachers can only manage grading and attendance for their assigned classes.
                </p>
              </article>
            )}
          </main>
        </div>
      </section>

      <style>{`
        .docs-nav-item:hover {
          background: var(--primary-light) !important;
          color: var(--primary) !important;
          transform: translateX(4px);
        }
        @media (max-width: 900px) {
          .docs-container {
            grid-template-columns: 1fr !important;
          }
          .docs-nav {
            position: relative !important;
            top: 0 !important;
            display: flex !important;
            overflow-x: auto !important;
            gap: 8px !important;
          }
          .docs-nav-item {
            white-space: nowrap !important;
            width: auto !important;
          }
        }
      `}</style>
    </PremiumLayout>
  );
}
