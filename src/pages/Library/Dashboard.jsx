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
        <div className="overflow-x-auto">
          {data.recent_activity.length > 0 ? (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-4 px-6">Student</th>
                  <th className="py-4 px-6">Book Title</th>
                  <th className="py-4 px-6">Copy Code</th>
                  <th className="py-4 px-6">Action / Status</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {data.recent_activity.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-gray-800">{row.students?.name || 'Unknown'}</td>
                    <td className="py-4 px-6">{row.book_copies?.books?.title || 'Unknown Title'}</td>
                    <td className="py-4 px-6">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-700 font-bold border border-gray-200">
                        {row.book_copies?.copy_code}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {row.status === 'borrowed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                           <PlatformZapIcon size={12} /> Issued
                        </span>
                      ) : row.status === 'returned' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                           <BookIcon size={12} /> Returned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 capitalize">
                           {row.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <ClockIcon size={14} className="opacity-50" />
                        {new Date(row.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center text-gray-400 bg-white">
              <ClockIcon size={48} className="mb-4 opacity-50 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No circulation activity yet.</p>
              <p className="text-sm mt-1">Issue a book to see it appear here.</p>
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
