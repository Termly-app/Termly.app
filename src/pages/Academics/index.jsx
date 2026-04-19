import { Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import Loader from '../../components/Common/Loader';
import { BookIcon } from '../../components/CommonIcons';

const AssessmentTab = lazy(() => import('./AssessmentTab'));

export default function AcademicCenter({ currentUser, currentPeriodId }) {
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
      </div>

      <div className="academic-content" style={{ padding: '24px' }}>
        <Suspense fallback={<Loader />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <BookIcon size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>Assessment & Grading</h2>
          </div>
          <AssessmentTab currentUser={currentUser} currentPeriodId={currentPeriodId} />
        </Suspense>
      </div>

      <style>{`
        .academic-center-page {
          min-height: 100vh;
          background: var(--bg);
        }
      `}</style>
    </div>
  );
}
