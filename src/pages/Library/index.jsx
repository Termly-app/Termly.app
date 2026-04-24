import React, { lazy, Suspense } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Loader from '../../components/Common/Loader';
import {
  BookIcon, PlatformZapIcon, AlertIcon, MenuIcon
} from '../../components/CommonIcons';

import { useFeature } from '../../contexts/FeaturesContext';
import FeatureGate from '../../components/FeatureGate';

const Dashboard = lazy(() => import('./Dashboard'));
const BooksManagement = lazy(() => import('./BooksManagement'));
const IssueReturn = lazy(() => import('./IssueReturn'));
const Overdue = lazy(() => import('./Overdue'));
const Reports = lazy(() => import('./Reports'));

// Sub-navigation tabs for the Library module
function LibrarySubNav({ currentUser }) {
  const location = useLocation();
  const role = currentUser?.role?.toLowerCase() || '';
  const isAdmin = role === 'admin';
  const isLibrarian = role === 'librarian';

  const tabs = [
    { to: '/library', label: 'Dashboard', icon: MenuIcon, exact: true },
    { to: '/library/books', label: 'Books', icon: BookIcon },
    ...((isAdmin || isLibrarian) ? [
      { to: '/library/issue-return', label: 'Issue / Return', icon: PlatformZapIcon },
      { to: '/library/overdue', label: 'Overdue', icon: AlertIcon },
    ] : []),
    { to: '/library/reports', label: 'Reports', icon: MenuIcon },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: '6px 8px',
      background: 'var(--bg)',
      borderRadius: 14,
      border: '1px solid var(--border)',
      marginBottom: 24,
      overflowX: 'auto',
      flexWrap: 'nowrap'
    }}>
      {tabs.map(tab => {
        const isActive = tab.exact
          ? location.pathname === tab.to
          : location.pathname.startsWith(tab.to);
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-light)',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              border: isActive ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            <Icon size={14} />
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}

export default function LibraryModule({ currentUser, currentPeriodId }) {
  const { enabled: hasAccess, loading: featureLoading } = useFeature('library');

  if (featureLoading) return <Loader />;
  if (!hasAccess) return <FeatureGate featureName="Library Management" />;

  return (
    <div className="animate-in">
      <Helmet>
        <title>Library Management | ShuleSoft</title>
        <meta name="description" content="Manage school library books, track loans, generate reports, and handle overdue books." />
      </Helmet>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header-actions">
          <div>
            <h2>Library Management</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                Book circulation & inventory tracking
              </span>
            </div>
          </div>
        </div>
      </div>

      <LibrarySubNav currentUser={currentUser} />

      <Suspense fallback={<Loader />}>
        <Routes>
          <Route index element={<Dashboard currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
          <Route path="books" element={<BooksManagement currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
          <Route path="issue-return" element={<IssueReturn currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
          <Route path="overdue" element={<Overdue currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
          <Route path="reports" element={<Reports currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
