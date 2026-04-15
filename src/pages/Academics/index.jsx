import { useState, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import Loader from '../../components/Common/Loader';
import { BookIcon, GraduationIcon } from '../../components/CommonIcons';

const AssessmentTab = lazy(() => import('./AssessmentTab'));
const ExamsTab = lazy(() => import('./ExamsTab'));

export default function AcademicCenter({ currentUser, currentPeriodId }) {
  const [activeTab, setActiveTab] = useState('assessment'); // 'assessment' or 'exams'

  return (
    <div className="academic-center-page animate-in">
      <Helmet>
        <title>Academic Center | ShuleSoft</title>
        <meta name="description" content="Manage school assessments and formal exam sessions in one place." />
      </Helmet>

      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 0 }}>
        <div style={{ padding: '0 24px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>Academic Center</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Unified results management for daily assessment and formal exams</p>
        </div>

        {/* Unified Tab Switcher */}
        <div className="tab-switcher" style={{ 
          display: 'flex', 
          gap: '32px', 
          marginTop: '24px', 
          padding: '0 24px',
          borderBottom: '1px solid var(--border)' 
        }}>
          <button 
            onClick={() => setActiveTab('assessment')}
            style={{
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'assessment' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'assessment' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'assessment' ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <BookIcon size={18} />
            Assessment & Grading
          </button>
          <button 
            onClick={() => setActiveTab('exams')}
            style={{
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'exams' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'exams' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'exams' ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <GraduationIcon size={18} />
            Formal Exam Sessions
          </button>
        </div>
      </div>

      <div className="academic-content" style={{ padding: '24px' }}>
        <Suspense fallback={<Loader />}>
          {activeTab === 'assessment' ? (
            <AssessmentTab currentUser={currentUser} currentPeriodId={currentPeriodId} />
          ) : (
            <ExamsTab currentUser={currentUser} currentPeriodId={currentPeriodId} />
          )}
        </Suspense>
      </div>

      <style>{`
        .academic-center-page {
          min-height: 100vh;
          background: var(--bg);
        }
        .tab-switcher button:hover {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
