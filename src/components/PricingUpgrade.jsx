import { RocketIcon, CheckIcon, CardIcon, GraduationIcon, ClockIcon, BookIcon, SMSIcon } from './CommonIcons';
import { useNavigate } from 'react-router-dom';

/**
 * PricingUpgrade Component
 * Shown when a Sandbox user attempts to access a premium feature.
 */
export default function PricingUpgrade({ featureName, requiredPlan = "Starter Plan" }) {
  const navigate = useNavigate();

  const featureDetails = {
    'Fees': {
      icon: <CardIcon size={48} />,
      title: 'Automate Fee Collection',
      desc: 'Connect M-Pesa STK push, track partial payments, and generate professional receipts instantly.',
      benefits: ['Real-time fee balances', 'Automated SMS reminders', 'M-Pesa reconciliation', 'Bulk receipt printing']
    },
    'Grading': {
      icon: <GraduationIcon size={48} />,
      title: 'KNEC-Aligned Grading',
      desc: 'Generate CBC assessment sheets and 8-4-4 report cards without manual calculations.',
      benefits: ['CBC Competency tracking', 'Automated ranking', 'Email/SMS report cards', 'Performance analytics']
    },
    'Attendance': {
      icon: <CheckIcon size={48} />,
      title: 'Smart Attendance',
      desc: 'Mark daily registers on mobile and notify parents instantly if a child is absent or late.',
      benefits: ['Mobile teacher portal', 'Instant parent alerts', 'Monthly trend reports', 'Export to NEMIS']
    },
    'Timetable': {
      icon: <ClockIcon size={48} />,
      title: 'Conflict-Free Scheduling',
      desc: 'Build complex school timetables in minutes. Handles teacher workloads and room conflicts automatically.',
      benefits: ['Auto-generation', 'Staff workload tracking', 'Print-ready schedules', 'Classroom optimization']
    }
  };

  const current = featureDetails[featureName] || {
    icon: <RocketIcon size={48} />,
    title: `Unlock ${featureName}`,
    desc: 'Power up your school with advanced modules designed to save your staff hours of manual work.',
    benefits: ['Increased efficiency', 'Data-driven decisions', 'Professional school reports', 'Better parent engagement']
  };

  return (
    <div className="animate-fade-up" style={{ 
      maxWidth: 900, 
      margin: '40px auto', 
      padding: '40px 20px',
      textAlign: 'center' 
    }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #4A32E0 0%, #6155FF 100%)',
        borderRadius: 24,
        padding: '60px 40px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(74, 50, 224, 0.2)'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ 
            width: 80, height: 80, 
            background: 'rgba(255,255,255,0.15)', 
            borderRadius: 20, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {current.icon}
          </div>
          
          <div style={{ 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em', 
            marginBottom: 12,
            opacity: 0.8
          }}>
            Premium Module
          </div>
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 16 }}>{current.title}</h1>
          <p style={{ fontSize: '1.1rem', maxWidth: 600, margin: '0 auto 40px', opacity: 0.9, lineHeight: 1.6 }}>
            {current.desc}
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 20, 
            marginBottom: 50,
            textAlign: 'left'
          }}>
            {current.benefits.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 12 }}>
                <div style={{ color: '#0DD88A' }}><CheckIcon size={16} /></div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{b}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button 
              onClick={() => navigate('/billing')}
              className="btn" 
              style={{ 
                background: '#fff', 
                color: '#4A32E0', 
                padding: '16px 32px', 
                fontSize: '1rem', 
                fontWeight: 800,
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
              }}
            >
              Upgrade to {requiredPlan}
            </button>
            <button 
              onClick={() => navigate('/help')}
              className="btn btn-ghost" 
              style={{ 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '16px 32px'
              }}
            >
              Learn How it Works
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, background: 'rgba(0,0,0,0.1)', borderRadius: '50%' }}></div>
      </div>

      <div style={{ marginTop: 40, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Currently on <strong>Sandbox Plan</strong>. Exploration mode allows you to view documentation and setup wizards for all modules.
      </div>
    </div>
  );
}
