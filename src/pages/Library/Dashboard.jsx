import React, { useState, useEffect } from 'react';
import { getLibraryDashboard } from '../../data/libraryStore';
import { 
  BookIcon, PlatformZapIcon, AlertIcon, UserIcon, ClockIcon, 
  MenuIcon
} from '../../components/CommonIcons';
import Loader from '../../components/Common/Loader';
import { Link } from 'react-router-dom';

export default function Dashboard({ currentPeriodId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    total_books: 0,
    total_copies: 0,
    borrowed_count: 0,
    overdue_count: 0,
    recent_activity: []
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await getLibraryDashboard();
        setData(d);
      } catch (e) {
        console.error("Dashboard data load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPeriodId]);

  if (loading) return <Loader />;

  return (
    <div className="animate-in space-y-6 pb-12">
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link to="/library/issue-return" className="btn btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlatformZapIcon size={20} /> Issue Book
        </Link>
        <Link to="/library/issue-return" className="btn btn-ghost" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)' }}>
           <MenuIcon size={20} /> Return Book
        </Link>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <StatCard 
          title="Total Titles" 
          value={data.total_books} 
          icon={<BookIcon size={28} />} 
          colors={{ bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE' }}
        />
        <StatCard 
          title="Total Copies" 
          value={data.total_copies} 
          icon={<MenuIcon size={28} />} 
          colors={{ bg: '#EEF2FF', text: '#4F46E5', border: '#E0E7FF' }}
        />
        <StatCard 
          title="Currently Borrowed" 
          value={data.borrowed_count} 
          icon={<PlatformZapIcon size={28} />} 
          colors={{ bg: '#ECFDF5', text: '#059669', border: '#D1FAE5' }}
        />
        <StatCard 
          title="Overdue Books" 
          value={data.overdue_count} 
          icon={<AlertIcon size={28} />} 
          colors={data.overdue_count > 0 ? { bg: '#FEF2F2', text: '#DC2626', border: '#FEE2E2' } : { bg: '#F9FAFB', text: '#6B7280', border: '#F3F4F6' }}
        />
      </div>

      {/* RECENT ACTIVITY */}
      <div className="card shadow-sm border border-gray-100">
        <div className="card-header border-b border-gray-50 flex justify-between items-center bg-white rounded-t-xl">
          <h3 className="font-bold text-lg text-gray-800">Recent Circulation Activity</h3>
        </div>
        <div className="table-wrapper bg-white">
          {data.recent_activity.length > 0 ? (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Book Title</th>
                  <th>Copy Code</th>
                  <th>Action / Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_activity.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{row.students?.name || 'Unknown'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{row.book_copies?.books?.title || 'Unknown Title'}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', padding: '2px 4px', borderRadius: '4px', fontWeight: 600 }}>
                        {row.book_copies?.copy_code}
                      </code>
                    </td>
                    <td>
                      {row.status === 'borrowed' ? (
                        <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>
                           Issued
                        </span>
                      ) : row.status === 'returned' ? (
                        <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>
                           Returned
                        </span>
                      ) : (
                        <span className="badge badge-ghost" style={{ textTransform: 'uppercase' }}>
                           {row.status}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ClockIcon size={14} />
                        {new Date(row.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-light)', background: '#fff' }}>
              <ClockIcon size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>No circulation activity yet.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Issue a book to see it appear here.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon, colors }) {
  return (
    <div style={{ 
      padding: '24px', 
      borderRadius: '16px', 
      border: `1px solid ${colors.border}`, 
      backgroundColor: colors.bg, 
      color: colors.text,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ 
        padding: '12px', 
        borderRadius: '12px', 
        backgroundColor: '#fff', 
        width: 'fit-content',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.875rem', fontWeight: 900, marginBottom: '4px' }}>{value?.toLocaleString()}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>{title}</div>
      </div>
    </div>
  )
}
