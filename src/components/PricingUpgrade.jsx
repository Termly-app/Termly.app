import React from 'react';
import { RocketIcon, CheckIcon, CardIcon, GraduationIcon, ClockIcon, BookIcon, MessageIcon, UsersIcon, TeacherIcon } from './CommonIcons';
import { useNavigate } from 'react-router-dom';

/**
 * Redesigned PricingUpgrade Component
 * Provides a high-end, 'WOW' experience for Sandbox users encountering locked features.
 */
export default function PricingUpgrade({ featureName, requiredPlan = "Professional Plan" }) {
  const navigate = useNavigate();

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
    }
  };

  const current = featureDetails[featureName] || {
    icon: <RocketIcon size={56} />,
    title: `Upgrade to Unlock ${featureName}`,
    desc: 'Take your school management to the next level with advanced modules designed to minimize administrative work.',
    benefits: ['Unlock advanced analytics', 'Automate manual staff tasks', 'Expand portal capabilities', 'Dedicated priority support'],
    color: '#6366F1'
  };

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
              Premium Feature
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
              onClick={() => navigate('/billing')}
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
              Upgrade to Unlock Now
            </button>
            <button 
              onClick={() => navigate('/support')}
              className="btn btn-ghost"
              style={{
                padding: '16px 36px',
                fontSize: '1.05rem',
                fontWeight: 600,
                borderRadius: 16,
                border: '2px solid #E2E8F0',
                color: '#64748B'
              }}
            >
              Speak to an Agent
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
