import { useState } from 'react';
import { 
  RocketIcon, BookIcon, CardIcon, GraduationIcon, ClockIcon, 
  MessageIcon, LeafIcon, StudentIcon, SearchIcon, ArrowRightIcon,
  CheckIcon, InfoIcon, ShieldIcon, CalendarIcon
} from '../components/CommonIcons';
import { Link } from 'react-router-dom';

/**
 * HelpCenter Component
 * A comprehensive knowledge base for ShuleSoft features.
 */
const HELP_CATEGORIES = [
  { id: 'onboarding', name: 'Getting Started', icon: <RocketIcon size={24} />, color: '#5B3EF5' },
  { id: 'students', name: 'Student Management', icon: <StudentIcon size={24} />, color: '#0EA5E9' },
  { id: 'cbc', name: 'CBC & Grading', icon: <GraduationIcon size={24} />, color: '#8B5CF6' },
  { id: 'fees', name: 'Fees & Payments', icon: <CardIcon size={24} />, color: '#10B981' },
  { id: 'timetable', name: 'Timetabling', icon: <ClockIcon size={24} />, color: '#F59E0B' },
  { id: 'comms', name: 'Communication', icon: <MessageIcon size={24} />, color: '#EF4444' }
];

const ARTICLES = {
  onboarding: [
    { title: 'Sandbox Plan: Exploration Mode', content: 'The Sandbox plan allows you to test ALL features with a limit of 10 students. No credit card required. Explore how ShuleSoft can transform your school administration before committing to a paid plan.' },
    { title: 'Initial Setup Checklist', content: '1. Update your School Profile. 2. Add your Classes and Streams. 3. Import your student list via CSV. 4. Configure your Academic Term.' },
    { title: 'User Roles & Permissions', content: 'System Admins have full control. Teachers can mark attendance and input marks. Accountants manage fees. Learn how to invite your staff and assign roles.' }
  ],
  students: [
    { title: 'Bulk Student Import (CSV)', content: 'Save hours by importing your entire student list at once. Use our CSV template with columns for Name, Adm No, Class, and Parent Phone. You can edit data directly in the browser before final import.' },
    { title: 'Managing Student Profiles', content: 'Track everything from birth certificates to KCPE scores. Upload student photos and manage parent contact details for instant communication.' },
    { title: 'Promotions & Transitions', content: 'Automatically move students to the next grade at the end of the year. The system handles graduations and transfers between streams seamlessly.' }
  ],
  cbc: [
    { title: 'CBC Assessment Framework', content: 'Record Learner Progress across all core competencies. Generate Professional Assessment Sheets and Report Cards aligned with the latest KNEC requirements for PP1 through Grade 9.' },
    { title: '8-4-4 Grading System', content: 'For older classes, use our traditional 8-4-4 grading engine. Configure custom mean score calculations and automated ranking.' },
    { title: 'Portfolio Management', content: 'Attach evidence of learning directly to student profiles. Build a digital portfolio for every learner over their entire primary school journey.' }
  ],
  fees: [
    { title: 'M-Pesa Integration', content: 'Enable automated fee tracking with our M-Pesa STK Push technology. Parents receive a prompt on their phone, and the system records the payment instantly.' },
    { title: 'Fee Structure Builder', content: 'Set different fees for different classes (e.g., Boarding vs Day, Grade 1 vs Grade 6). Auto-generate invoices for the entire school with one click.' },
    { title: 'Defaulter Management', content: 'Identify students with outstanding balances instantly. Send bulk SMS reminders to parents and track payment plans over time.' }
  ],
  timetable: [
    { title: 'Master Timetable Generation', content: 'Input your subjects and teacher assignments. Our smart engine detects conflicts and ensures no teacher or room is double-booked.' },
    { title: 'Staff Workload Analysis', content: 'Balance teaching loads across your staff. View reports on teaching hours per week for every teacher.' }
  ],
  comms: [
    { title: 'Bulk SMS Notifications', content: 'Send urgent alerts, fee reminders, or exam results to all parents or filtered groups instantly.' },
    { title: 'Email Reports', content: 'Automatically send digital report cards and fee statements to parent emails, saving on printing costs.' }
  ]
};

export default function HelpCenter() {
  const [activeCategory, setActiveCategory] = useState('onboarding');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = searchQuery 
    ? HELP_CATEGORIES.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ARTICLES[c.id].some(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : HELP_CATEGORIES;

  return (
    <div className="animate-in" style={{ paddingBottom: 60 }}>
      {/* Header Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #4A32E0 0%, #6155FF 100%)',
        padding: '60px 40px',
        borderRadius: '0 0 40px 40px',
        textAlign: 'center',
        color: '#fff',
        marginBottom: 40
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12 }}>How can we help you?</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: 30 }}>Search our knowledge base or browse by category</p>
        
        <div style={{ 
          maxWidth: 600, 
          margin: '0 auto', 
          position: 'relative'
        }}>
          <div style={{ 
            position: 'absolute', 
            left: 20, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--primary)',
            zIndex: 3
          }}>
            <SearchIcon size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search for articles (e.g. 'M-Pesa', 'Import')..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '18px 24px 18px 56px', 
              borderRadius: '100px', 
              border: 'none', 
              fontSize: '1rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              fontWeight: 500,
              color: '#333'
            }}
          />
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 40, padding: '0 20px' }}>
        {/* Sidebar Categories */}
        <div>
          <div style={{ position: 'sticky', top: 100 }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 20, letterSpacing: '0.1em' }}>Categories</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: activeCategory === cat.id ? 'var(--primary-light)' : 'transparent',
                    color: activeCategory === cat.id ? 'var(--primary)' : 'var(--text)',
                    fontWeight: activeCategory === cat.id ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ color: activeCategory === cat.id ? 'var(--primary)' : 'var(--text-muted)' }}>{cat.icon}</div>
                  {cat.name}
                </button>
              ))}
            </div>
            
            <div style={{ marginTop: 40, padding: 24, background: '#F8FAFC', borderRadius: 20, border: '1px solid #E2E8F0' }}>
              <div style={{ color: 'var(--primary)', marginBottom: 12 }}><InfoIcon size={24} /></div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Need more help?</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>Our support team is available 24/7 to assist with your school setup.</p>
              <button className="btn btn-primary btn-sm btn-block">Chat with us</button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div>
          <div style={{ marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              {HELP_CATEGORIES.find(c => c.id === activeCategory)?.icon}
              {HELP_CATEGORIES.find(c => c.id === activeCategory)?.name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {ARTICLES[activeCategory]?.length} articles
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {ARTICLES[activeCategory]?.map((art, idx) => (
              <div 
                key={idx} 
                className="card animate-fade-in" 
                style={{ 
                  padding: 30, 
                  borderRadius: 24, 
                  border: '1px solid var(--edge)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  animationDelay: `${idx * 0.1}s`
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12, color: 'var(--primary)' }}>{art.title}</h3>
                <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{art.content}</p>
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
                  Read full guide <ArrowRightIcon size={14} />
                </div>
              </div>
            ))}
          </div>

          {/* Tips Section */}
          <div style={{ marginTop: 60, padding: 40, background: 'linear-gradient(135deg, #0DD88A 0%, #10B981 100%)', borderRadius: 40, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 }}><CheckIcon size={24} /></div>
                <h3 style={{ margin: 0, fontWeight: 900 }}>Pro Tip: Use Bulk Import</h3>
              </div>
              <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.5, maxWidth: 500 }}>
                The fastest way to get started is by importing your student list. Most schools go live in under 15 minutes by uploading their Excel/CSV lists directly.
              </p>
              <Link to="/students" className="btn" style={{ background: '#fff', color: '#10B981', marginTop: 24, fontWeight: 800 }}>Try it now</Link>
            </div>
            <div style={{ position: 'absolute', right: -30, bottom: -30, opacity: 0.2 }}>
              <UploadLargeIcon size={200} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-block { width: 100%; display: block; }
      `}</style>
    </div>
  );
}

function UploadLargeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
