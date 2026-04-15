import { useState } from 'react';
import { 
  RocketIcon, BookIcon, CardIcon, GraduationIcon, ClockIcon, 
  MessageIcon, StudentIcon, SearchIcon, ChevronRightIcon,
  CheckIcon, InfoIcon
} from '../components/CommonIcons';
import { Link } from 'react-router-dom';

/**
 * HelpCenter Component
 * A comprehensive knowledge base for ShuleSoft features.
 */

export default function HelpCenter() {
  const HELP_CATEGORIES = [
    { id: 'onboarding', name: 'Getting Started', icon: <RocketIcon size={24} />, color: '#5B3EF5' },
    { id: 'students', name: 'Student Management', icon: <StudentIcon size={24} />, color: '#0EA5E9' },
    { id: 'cbc', name: 'CBC & Grading', icon: <GraduationIcon size={24} />, color: '#8B5CF6' },
    { id: 'exams', name: 'Formal Exams', icon: <GraduationIcon size={24} />, color: '#F43F5E' },
    { id: 'fees', name: 'Fees & Payments', icon: <CardIcon size={24} />, color: '#10B981' },
    { id: 'timetable', name: 'Timetabling', icon: <ClockIcon size={24} />, color: '#F59E0B' },
    { id: 'library', name: 'Library Management', icon: <BookIcon size={24} />, color: '#8B5CF6' },
    { id: 'comms', name: 'Communication', icon: <MessageIcon size={24} />, color: '#EF4444' },
    { id: 'nemis', name: 'NEMIS Compliance', icon: <FlagIcon size={24} />, color: '#0EA5E9' }
  ];

  const ARTICLES = {
    onboarding: [
      { title: 'Sandbox Plan: Exploration Mode', content: 'The Sandbox plan allows you to test ALL features with a limit of 10 students. No credit card required. Explore how ShuleSoft can transform your school administration before committing to a paid plan.',
        steps: ['Register your school at shulesoft-app.vercel.app/register.', 'You will receive a Free Sandbox workspace instantly.', 'Add up to 10 test students to explore the system.', 'When ready, upgrade from Settings → Subscription.'],
        tip: 'Your Sandbox data is preserved when you upgrade — no need to re-enter anything.' },
      { title: 'Initial Setup Checklist', content: '1. Update your School Profile. 2. Add your Classes and Streams. 3. Import your student list via CSV. 4. Configure your Academic Term.',
        steps: ['Go to Settings → School Profile and fill in your school name, motto, and contact info.', 'Under Settings → Classes & Streams, activate the grades your school uses (e.g. Grade 1-6, Form 1-4).', 'Navigate to Students → Import CSV to bulk-upload your student list.', 'Check Dashboard to verify your current Academic Period is correct.'],
        tip: 'Complete these 4 steps and your school is fully operational. Most schools finish in under 15 minutes.' },
      { title: 'User Roles & Permissions', content: 'System Admins have full control. Teachers can mark attendance and input marks. Accountants manage fees. Learn how to invite your staff and assign roles.',
        steps: ['Go to Staff → Add Staff Member.', 'Enter their name, email, and select their role (Admin, Teacher, Finance, Librarian).', 'They will receive a login invitation via email.', 'Each role automatically restricts access to only relevant modules.'],
        tip: 'Only Admins can see Settings, Security, and Subscription modules. Teachers see only academic modules.' }
    ],
    students: [
      { title: 'Bulk Student Import (CSV)', content: 'Save hours by importing your entire student list at once. Use our CSV template with columns for Name, Adm No, Class, and Parent Phone. You can edit data directly in the browser before final import.',
        steps: ['Go to Students and click the "Import CSV" button in the toolbar.', 'Download our CSV template or prepare your own with columns: Name, Adm No, Class, Stream, Gender, Parent, Phone.', 'Upload the file — the system will preview all rows for you to verify.', 'Click "Import All" to save all students at once.'],
        tip: 'You can edit any cell directly in the preview table before importing. Fix typos and missing data right there.' },
      { title: 'Managing Student Profiles', content: 'Track everything from birth certificates to KCPE scores. Upload student photos and manage parent contact details for instant communication.',
        steps: ['Click any student name in the Students table to open their detailed profile.', 'Review their personal info, parent contacts, fee balance, and academic history.', 'Click "Edit" to update any field — changes are saved immediately.', 'Use the "Actions" menu to delete or transfer the student.'],
        tip: 'Parent phone numbers are used for SMS notifications and fee reminders. Keep them up to date.' },
      { title: 'Promotions & Transitions', content: 'Automatically move students to the next grade at the end of the year. The system handles graduations and transfers between streams seamlessly.',
        steps: ['Go to Students and click the "Transitions" button in the toolbar.', 'Select the source class (e.g. Grade 3) and the direction (Promote / Demote / Graduate).', 'Review the list of affected students. Uncheck any you want to exclude.', 'Click "Apply Transition" — all selected students move to the next class.'],
        tip: 'Always create a new Academic Period before running transitions. This preserves historical records.' }
    ],
    cbc: [
      { title: 'CBC Assessment Framework', content: 'Record Learner Progress across all core competencies. Generate Professional Assessment Sheets and Report Cards aligned with the latest KNEC requirements for PP1 through Grade 9.',
        steps: ['Go to Grading and select a CBC class (e.g. Grade 4 North).', 'Choose the subject and exam type (e.g. End Term).', 'Enter marks for each student — the system auto-calculates grades using the configured grading scale.', 'Click "Save Marks" to persist all entries.'],
        tip: 'You can configure custom grading scales in Settings → Grading Systems to match your school\'s policy.' },
      { title: '8-4-4 Grading System', content: 'For older classes, use our traditional 8-4-4 grading engine. Configure custom mean score calculations and automated ranking.',
        steps: ['Go to Grading and select a Secondary class (e.g. Form 2 East).', 'Select the subject and enter marks for each student.', 'The system auto-ranks students by mean score.', 'Print report cards from the class view using the Print button.'],
        tip: 'The default grading scale is A-E. You can customize the grade boundaries in Settings → Grading Systems.' },
      { title: 'Portfolio Management', content: 'Attach evidence of learning directly to student profiles. Build a digital portfolio for every learner over their entire primary school journey.',
        steps: ['Open a student profile from the Students module.', 'Scroll to the "CBC Portfolio" section.', 'Upload images or documents as evidence of learning for specific competencies.', 'These are preserved across terms and years for longitudinal tracking.'],
        tip: 'Portfolios are especially important for Grade 6 transition assessments under the CBC framework.' }
    ],
    fees: [
      { title: 'Email Reports', content: 'Automatically send digital report cards and fee statements to parent emails, saving on printing costs.',
        steps: ['Ensure parent email addresses are recorded in student profiles.', 'Go to Grading → select a class → click "Email Report Cards".', 'The system generates PDF report cards and emails them to each parent.', 'A delivery summary shows which emails were sent successfully.'],
        tip: 'Parents without email addresses on file will be skipped. Use SMS as a fallback for those parents.' }
    ],
    exams: [
      { title: 'Formal Exam Lifecycle', content: 'Manage the entire lifecycle of formal exams, from creating sessions to automated ranking.',
        steps: ['Go to Exams and create a new session (e.g., "Term 1 Mock").', 'Configure subject papers and maximum marks for each paper.', 'Assign subjects to grades/streams.', 'Teachers enter marks via the dashboard or mobile portal.'],
        tip: 'Once marks entry is complete, close the exam to trigger automated student ranking across classes.' },
      { title: 'Automated Student Ranking', content: 'The system automatically calculates total marks, means, and ranks student performance.',
        steps: ['Ensure all marks are entered and synced.', 'Click "Close Exam" in the exam session dashboard.', 'The system will process all marks and update student report data.', 'View the ranking table to see top performers by stream and overall.'],
        tip: 'Ranking can be recalculated if you re-open and modify marks later.' }
    ],
    library: [
      { title: 'Cataloging Books', content: 'Build a digital catalog of your school\'s library books with ISBN and category tracking.',
        steps: ['Go to Library → Books tab.', 'Click "Add Book" and enter title, author, and ISBN.', 'Assign a category (e.g., Science, Humanities) for easier browsing.', 'Set the stock quantity for physical copies.'],
        tip: 'Use the search bar to quickly check if a book is already in your database before adding.' },
      { title: 'Borrowing & Returns', content: 'Track book movement across your student population with automated return tracking.',
        steps: ['Navigate to Library → Issue/Return.', 'Search for a student and select the book they wish to borrow.', 'Set a return date and confirm.', 'To return, click "Check In" on the student\'s active borrowing record.'],
        tip: 'Overdue books are highlighted in red to help librarians track late returns.' }
    ],
    nemis: [
      { title: 'NEMIS Data Audit', content: 'Perform a comprehensive audit of your student data health against government requirements.',
        steps: ['Go to Compliance → NEMIS Audit.', 'Review the "Data Gaps" breakdown showing missing UPIs, DOBs, etc.', 'Click "Fix" on any student to jump directly to their profile and update missing info.', 'The "NEMIS Ready" gauge shows your overall compliance percentage.'],
        tip: 'Aim for 100% readiness before the end-of-term reporting deadline.' },
      { title: 'Exporting MOE Reports', content: 'Generate high-fidelity CSV files compatible with the Kenya Ministry of Education portal.',
        steps: ['Once your data is compliant, click "Export NEMIS CSV".', 'The file will include 22 mandatory reporting fields correctly formatted.', 'Open the file in Excel for a final check, then upload to nemis.education.go.ke.'],
        tip: 'The export includes a term-specific filename for better archive management.' }
    ]
  };

  const [activeCategory, setActiveCategory] = useState('onboarding');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

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
            
            {/* Need more help? card removed */}
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
                onClick={() => setSelectedArticle(art)}
                style={{ 
                  padding: 30, 
                  borderRadius: 24, 
                  border: '1px solid var(--edge)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  animationDelay: `${idx * 0.1}s`,
                  cursor: 'pointer'
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12, color: 'var(--primary)' }}>{art.title}</h3>
                <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{art.content}</p>
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                  Read full guide <ChevronRightIcon size={14} />
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
          </div>
        </div>
      </div>

      {/* HELP ARTICLE MODAL */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content animate-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)}>&times;</button>
            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8, color: '#0f172a' }}>{selectedArticle.title}</h2>
              <div style={{ height: 4, width: 40, background: 'var(--primary)', borderRadius: 2 }}></div>
            </div>
            
            <div style={{ color: '#475569', lineHeight: 1.7, fontSize: '1.05rem' }}>
              <p style={{ marginBottom: 24 }}>{selectedArticle.content}</p>
              
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Step-by-Step Guide:</h4>
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(selectedArticle.steps || []).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              {selectedArticle.tip && (
                <div style={{ marginTop: 24, padding: 16, background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe', display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                  <div style={{ fontSize: '0.9rem', color: '#1e40af' }}>
                    <strong>Pro Tip:</strong> {selectedArticle.tip}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedArticle(null)}
                style={{ padding: '12px 28px', background: '#5b3ef5', color: 'white', border: 'none', borderRadius: 100, fontWeight: 700, cursor: 'pointer' }}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
        }

        .modal-content {
          background: white;
          width: 100%;
          max-width: 640px;
          border-radius: 32px;
          padding: 48px;
          position: relative;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.15);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-close {
          position: absolute;
          top: 24px; right: 24px;
          background: #f1f5f9;
          border: none;
          width: 40px; height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-close:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

        .animate-modal {
          animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .animate-in {
          animation: fadeIn 0.5s ease-out both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
