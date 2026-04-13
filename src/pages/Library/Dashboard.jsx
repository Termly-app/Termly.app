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
      
      {/* QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Link to="/library/issue-return" className="btn btn-primary shadow-lg shadow-primary/20 py-3 px-6 flex items-center justify-center gap-2 flex-1 md:flex-none hover:-translate-y-1 transition-transform">
          <PlatformZapIcon size={20} /> Issue Book
        </Link>
        <Link to="/library/issue-return" className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 py-3 px-6 flex items-center justify-center gap-2 flex-1 md:flex-none shadow-sm hover:-translate-y-1 transition-transform">
           <MenuIcon size={20} /> Return Book
        </Link>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Titles" 
          value={data.total_books} 
          icon={<BookIcon size={28} />} 
          color="blue" 
        />
        <StatCard 
          title="Total Copies" 
          value={data.total_copies} 
          icon={<MenuIcon size={28} />} 
          color="indigo" 
        />
        <StatCard 
          title="Currently Borrowed" 
          value={data.borrowed_count} 
          icon={<PlatformZapIcon size={28} />} 
          color="green" 
        />
        <StatCard 
          title="Overdue Books" 
          value={data.overdue_count} 
          icon={<AlertIcon size={28} />} 
          color={data.overdue_count > 0 ? "red" : "gray"} 
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

function StatCard({ title, value, icon, color }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100 shadow-red-100",
    gray: "bg-gray-50 text-gray-500 border-gray-100"
  };

  const selectedColor = colorMap[color] || colorMap.gray;

  return (
    <div className={`p-6 rounded-2xl border flex flex-col justify-between items-start gap-4 transition-all duration-300 hover:shadow-lg ${selectedColor}`}>
      <div className={`p-3 rounded-xl bg-white shadow-sm ring-1 ring-black/5`}>
        {icon}
      </div>
      <div>
        <div className="text-3xl font-black mb-1">{value?.toLocaleString()}</div>
        <div className="text-sm font-bold uppercase tracking-wide opacity-80">{title}</div>
      </div>
    </div>
  )
}
