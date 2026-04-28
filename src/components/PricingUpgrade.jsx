import React from 'react';
import { RocketIcon, CheckIcon, CardIcon, GraduationIcon, ClockIcon, BookIcon, MessageIcon, UsersIcon, TeacherIcon } from './CommonIcons';
import { SettingsIcon } from './Common/Icons';
import { useNavigate } from 'react-router-dom';

/**
 * PricingUpgrade Component
 * 
 * Two modes:
 * 1. Sandbox users → Premium upgrade CTA (navigate to /billing)
 * 2. Paid users with module disabled by admin → "Module Disabled" notice (navigate to /settings)
 */
export default function PricingUpgrade({ featureName, requiredPlan = "Professional Plan", profile }) {
  const navigate = useNavigate();

  // Determine if this is a paid user who just has the module turned off
  const planName = profile?.subscriptionPlan?.toLowerCase() || 'sandbox';
  const isPaidUser = planName !== 'sandbox' && planName !== '';

  const featureDetails = {
    'Fees': {
      icon: <CardIcon size={56} />,
      title: 'Automate Fee Collection',
      desc: 'Seamlessly track every shilling. From M-Pesa STK push to automated balancing, eliminate manual accounting forever.',
      benefits: ['Real-time fee tracking & balances', 'Automated SMS receipt notifications', 'Instant financial trend reports', 'One-click bulk receipt printing'],
      color: '#0EA5E9'
    },
    'Grading': {
      icon: <GraduationIcon size={56} />,
      title: 'KNEC-Ready Report Cards',
      desc: 'Let our engine handle the math. Generate CBC competency reports and 8-4-4 ranking in seconds, not weeks.',
      benefits: ['CBC Competency assessment sheets', 'Automated student rankings', 'PDF report card generation', 'Performance curve analytics'],
      color: '#8B5CF6'
    },
    'Attendance': {
      icon: <CheckIcon size={56} />,
      title: 'Instant Absentee Alerts',
      desc: 'Modern roll-call for modern schools. Notify parents via SMS the second their child is marked absent or late.',
      benefits: ['Mobile register management', 'One-tap SMS parent alerts', 'Monthly attendance summaries', 'Safe-arrival timestamps'],
      color: '#10B981'
    },
    'Timetable': {
      icon: <ClockIcon size={56} />,
      title: 'Conflict-Free Scheduling',
      desc: 'Optimize your staff and space. Build complex school schedules without teacher overwork or room collisions.',
      benefits: ['Auto-generation algorithms', 'Teacher workload oversight', 'Print-ready class schedules', 'Substitution management'],
      color: '#F59E0B'
    },
    'Communications': {
      icon: <MessageIcon size={56} />,
      title: 'Unified School SMS',
      desc: 'Communicate with authority. Reach every parent and guardian at scale with professional, school-branded updates.',
      benefits: ['Bulk SMS broadcasting', 'Scheduled school alerts', 'Delivery report tracking', 'Template-based messaging'],
      color: '#EF4444'
    },
    'Teacher Portal': {
      icon: <TeacherIcon size={56} />,
      title: 'Teacher Mobile Portal',
      desc: 'Empower your staff. Let teachers mark attendance, enter marks, and manage their classes directly from their phones.',
      benefits: ['Mobile mark entry', 'Digital registers', 'Teacher-parent messaging', 'Smart lesson planning'],
      color: '#0EA5E9'
    },
    'Parent Portal': {
      icon: <UsersIcon size={56} />,
      title: 'Real-time Parent Engagement',
      desc: 'Bridge the gap. Give parents instant access to fees, results, and school updates through a secure personal portal.',
      benefits: ['Instant fee balance viewing', 'Child performance tracking', 'Direct school communication', 'Secure result card access'],
      color: '#8B5CF6'
    }
  };

  const current = featureDetails[featureName] || {
    icon: <RocketIcon size={56} />,
    title: `Upgrade to Unlock ${featureName}`,
    desc: 'Take your school management to the next level with advanced modules designed to minimize administrative work.',
    benefits: ['Unlock advanced analytics', 'Automate manual staff tasks', 'Expand portal capabilities', 'Dedicated priority support'],
    color: '#6366F1'
  };

  // ═══════════════════════════════════════════════════════════════════
  // PAID USER — MODULE DISABLED BY ADMINISTRATOR
  // ═══════════════════════════════════════════════════════════════════
  if (isPaidUser) {
    return (
      <div className="upgrade-container animate-in" style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: 'transparent'
      }}>
        <div style={{
          maxWidth: 640,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 32,
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Amber accent bar */}
          <div style={{ height: 8, background: 'linear-gradient(90deg, #F59E0B 0%, #EAB308 100%)', width: '100%' }}></div>

          <div style={{ padding: '60px 50px', position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <div style={{
              width: 96, height: 96,
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#F59E0B',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 28px',
              border: '1.5px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '0 12px 30px rgba(245, 158, 11, 0.1)'
            }}>
              <SettingsIcon size={48} />
            </div>

            <div style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#B45309',
              borderRadius: 20,
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 16
            }}>
              Module Not Active
            </div>

            <h1 style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-1px',
              marginBottom: 16
            }}>
              {featureName} is Disabled
            </h1>

            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.7,
              color: '#475569',
              maxWidth: 480,
              margin: '0 auto 12px'
            }}>
              This module is currently inactive for your school. 
              Please contact Termly Support to enable this feature.
            </p>

            <p style={{
              fontSize: '0.85rem',
              color: '#94A3B8',
              marginBottom: 40
            }}>
              Ask your school administrator to enable this module, or go to Settings → Module Management.
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/support')}
                className="btn"
                style={{
                  background: '#F59E0B',
                  color: '#fff',
                  padding: '16px 36px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  borderRadius: 16,
                  boxShadow: '0 10px 25px rgba(245, 158, 11, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                Contact Support
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-ghost"
                style={{
                  padding: '16px 36px',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  borderRadius: 16,
                  background: 'rgba(0,0,0,0.05)',
                  color: '#475569'
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Decorative background */}
          <div style={{
            position: 'absolute',
            top: -120, right: -120,
            width: 250, height: 250,
            background: 'rgba(245, 158, 11, 0.08)',
            filter: 'blur(80px)',
            borderRadius: '50%'
          }}></div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // SANDBOX USER — UPGRADE CTA
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="upgrade-container animate-in" style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'transparent'
    }}>
      <div className="upgrade-glass-card" style={{
        maxWidth: 820,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 32,
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Dynamic color accent bar */}
        <div style={{ height: 8, background: current.color, width: '100%' }}></div>

        <div style={{ padding: '60px 50px', position: 'relative', zIndex: 10 }}>
          <div className="upgrade-header" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              width: 96, height: 96,
              background: `${current.color}15`,
              color: current.color,
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 28px',
              border: `1.5px solid ${current.color}25`,
              boxShadow: `0 12px 30px ${current.color}15`
            }}>
              {current.icon}
            </div>
            
            <div style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: `${current.color}10`,
              color: current.color,
              borderRadius: 20,
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 16
            }}>
              Optional Module
            </div>
            
            <h1 style={{ 
              fontSize: '2.75rem', 
              fontWeight: 900, 
              color: '#0F172A', 
              letterSpacing: '-1.5px',
              marginBottom: 16
            }}>
              {current.title}
            </h1>
            
            <p style={{ 
              fontSize: '1.15rem', 
              lineHeight: 1.6, 
              color: '#475569', 
              maxWidth: 580, 
              margin: '0 auto' 
            }}>
              {current.desc}
            </p>
          </div>

          <div className="upgrade-benefits" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: 16,
            marginBottom: 48
          }}>
            {current.benefits.map((b, i) => (
              <div key={i} style={{ 
                background: '#F8FAFC',
                padding: '16px 20px',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid #F1F5F9'
              }}>
                <div style={{ color: '#10B981', flexShrink: 0 }}><CheckIcon size={18} /></div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{b}</div>
              </div>
            ))}
          </div>

          <div className="upgrade-actions" style={{ 
            display: 'flex', 
            gap: 16, 
            justifyContent: 'center', 
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => navigate('/support')}
              className="btn"
              style={{
                background: current.color,
                color: '#fff',
                padding: '16px 36px',
                fontSize: '1.05rem',
                fontWeight: 700,
                borderRadius: 16,
                boxShadow: `0 10px 25px ${current.color}40`,
                transition: 'all 0.2s ease'
              }}
            >
              Contact Support to Enable
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn btn-ghost"
              style={{
                padding: '16px 36px',
                fontSize: '1.05rem',
                fontWeight: 600,
                borderRadius: 16,
                background: 'rgba(0,0,0,0.05)',
                color: '#475569'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Decorative background gradients */}
        <div style={{
          position: 'absolute',
          top: -150, left: -150,
          width: 300, height: 300,
          background: `${current.color}10`,
          filter: 'blur(100px)',
          borderRadius: '50%'
        }}></div>
      </div>
    </div>
  );
}
