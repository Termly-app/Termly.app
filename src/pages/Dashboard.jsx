import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  getStudents, getFeeSummary, getAttendanceSummary, getTodayStr,
  getFees, getSchoolStructure, getTeachers, getSchoolProfile,
  getMarks, getAttendance, subscribeToChanges, getUsers, getPlatformSettings,
  getPeriods, setActivePeriod, checkIsSubscriptionActive
} from '../data/store';
import Loader from '../components/Common/Loader';

export default function Dashboard({ currentUser, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [currentPeriodId, setPeriodId] = useState(null);
  const [isAccountActive, setIsAccountActive] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [students, fees, marks, teachers, profile, attendance, adminUsers, platformSettings, allPeriods] = await Promise.all([
          getStudents(), getFees(), getMarks(), getTeachers(), getSchoolProfile(), getAttendance(), getUsers(), getPlatformSettings(), getPeriods()
        ]);
        
        // Check activation
        const active = await checkIsSubscriptionActive(profile);
        setIsAccountActive(active);

        const activePeriod = allPeriods.find(p => p.is_active);
        setPeriods(allPeriods);
        setPeriodId(activePeriod?.id);

        const todayStr = getTodayStr();
        const [feeSummary, todayAtt, schoolStructure] = await Promise.all([
          getFeeSummary(fees, students, profile),
          getAttendanceSummary(todayStr, attendance),
          getSchoolStructure(students, marks, profile)
        ]);
        const allPayments = [];
        students.forEach(s => {
          const f = fees[s.id];
          if (f?.payments) f.payments.forEach(p => allPayments.push({ ...p, studentName: s.name, studentClass: s.class }));
        });
        allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        const collectionRate = feeSummary.totalExpected > 0
          ? ((feeSummary.totalCollected / feeSummary.totalExpected) * 100).toFixed(1) : 0;
        setData({
          totalStudents: students.length, totalTeachers: teachers.length,
          collectionRate: Number(collectionRate), feeSummary,
          attendance: todayAtt, recentPayments: allPayments.slice(0, 5),
          schoolStructure, profile, adminUsers, platformSettings,
        });
      } catch (err) {
        console.error(err);
        setData({
          totalStudents: 0, totalTeachers: 0, collectionRate: 0,
          feeSummary: { totalExpected:0, totalCollected:0, totalOutstanding:0, fullyPaid:0, partialPaid:0, unpaid:0 },
          attendance: { present:0, late:0, absent:0, total:0, percentage:0 },
          recentPayments: [], schoolStructure: {}, profile: {},
        });
      } finally { setLoading(false); }
    };
    loadData();
    const handlePeriodChange = () => {
      setLoading(true);
      loadData();
    };
    window.addEventListener('periodChanged', handlePeriodChange);
    const unsubs = [
      subscribeToChanges('students', loadData), subscribeToChanges('teachers', loadData),
      subscribeToChanges('payments', loadData), subscribeToChanges('attendance', loadData),
      subscribeToChanges('marks', loadData)
    ];
    return () => {
      window.removeEventListener('periodChanged', handlePeriodChange);
      unsubs.forEach(u => u());
    };
  }, []);

  const PLATFORM_ADMINS = ['admin@shulesoft.com', 'shulesoft8@gmail.com'];
  const isPlatformAdmin = currentUser?.email && PLATFORM_ADMINS.includes(currentUser.email);
  if (isPlatformAdmin) return <Navigate to="/super-admin" />;

  if (loading || !data) {
    return <Loader />;
  }

  const role = currentUser?.role?.toLowerCase() || 'teacher';
  const isTeacher = role === 'teacher';
  const isFinance  = role === 'finance';
  const formatKSh  = (n) => `KSh ${Number(n).toLocaleString()}`;

  const levelColors = {
    'Early Years':       { bg: '#ECFDF5', color: '#059669', accent: '#10B981', gradient: 'linear-gradient(135deg,#34D399,#10B981)' },
    'Upper Primary':     { bg: '#EFF6FF', color: '#1D4ED8', accent: '#3B82F6', gradient: 'linear-gradient(135deg,#60A5FA,#3B82F6)' },
    'Junior Secondary':  { bg: '#F5F3FF', color: '#6D28D9', accent: '#8B5CF6', gradient: 'linear-gradient(135deg,#A78BFA,#7C3AED)' },
    'Senior Secondary':  { bg: '#FFF1F2', color: '#BE123C', accent: '#F43F5E', gradient: 'linear-gradient(135deg,#FB7185,#E11D48)' },
  };
  const levelIcons = { 'Early Years':'🌱','Upper Primary':'📚','Junior Secondary':'🎓','Senior Secondary':'🚀' };

  const getGrade = (avg, level = 'Upper Primary') => {
    const scale = data?.profile?.gradingSystems?.[level] || 
                  data?.profile?.gradingSystems?.default || [
                    {min: 80, max: 100, grade: 'A', color: '#10B981'},
                    {min: 70, max: 79, grade: 'B', color: '#3B82F6'},
                    {min: 60, max: 69, grade: 'C', color: '#F59E0B'},
                    {min: 50, max: 59, grade: 'D', color: '#F97316'},
                    {min: 0, max: 49, grade: 'E', color: '#EF4444'}
                  ];
    const matched = scale.find(s => avg >= s.min && avg <= s.max);
    if (matched) return { grade: matched.grade || matched.symbol, color: matched.color };
    return { grade: '?', color: '#64748b' };
  };

  const plan = data.profile?.subscription_plan || data.profile?.subscriptionPlan || 'Fala';
  const pricing = data.platformSettings?.pricing || {};
  const planKey = Object.keys(pricing).find(k => k.toLowerCase() === plan.toLowerCase());
  const seatLimit = planKey ? (pricing[planKey].limit || 150) : 150;
  const totalStaff = data.adminUsers?.length || 0;
  
  const kpis = [
    { icon:'👨‍🎓', label:'Total Students',    value: data.totalStudents,       color:'#0EA5E9', bg:'#E0F2FE',  show: true          },
    { icon:'👩‍🏫', label:'Teaching Staff',    value: data.totalTeachers,       color:'#8B5CF6', bg:'#F5F3FF',  show: !isFinance     },
    { icon:'💰', label:'Fee Collection',      value: `${data.collectionRate}%`, color:'#10B981', bg:'#ECFDF5',  show: !isTeacher     },
    { icon:'📋', label:"Today's Attendance", value: `${data.attendance.percentage}%`, color:'#F59E0B', bg:'#FFFBEB', show: !isFinance },
    { icon:'🪑', label:'Seat Usage',        value: `${totalStaff}/${seatLimit}`, color:'#64748b', bg:'#f1f5f9', show: !isTeacher && !isFinance },
  ].filter(k => k.show);

  const quickActions = [
    { icon:'👨‍🎓', label:'Students',      sub:'Manage all students',   to:'/students',   bg:'#E0F2FE',  color:'#0EA5E9' },
    { icon:'👩‍🏫', label:'Teachers',      sub:'Manage staff',          to:'/teachers',   bg:'#F5F3FF',  color:'#8B5CF6' },
    { icon:'📋', label:'Attendance',     sub:'Record daily attendance', to:'/attendance', bg:'#ECFDF5',  color:'#10B981' },
    { icon:'💰', label:'Fees',           sub:'Fee collection & tracking', to:'/fees',    bg:'#FFFBEB',  color:'#F59E0B' },
  ];

  return (
    <div className="animate-fade-up">

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2>{data.profile?.schoolName || 'Dashboard'}</h2>
              <select 
                className="form-input" 
                style={{ width: 'auto', height: 32, fontSize: '0.75rem', padding: '0 10px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                value={currentPeriodId || ''}
                onChange={(e) => setActivePeriod(e.target.value)}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.year} {p.term} {p.is_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
            <p>Welcome back, <strong>{currentUser?.name || 'User'}</strong> — here's what's happening at your school today.</p>
          </div>
          <div className="inline-flex" style={{ gap: 10 }}>
            {!isAccountActive && (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--danger)' }}>
                ⚠️ Subscription Expired
              </div>
            )}
            {onLogout && (
              <button onClick={onLogout} className="btn btn-ghost btn-sm">
                🚪 Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ '--kpi-cols': kpis.length }}>
        {kpis.map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-card-top">
              <div className="kpi-icon" style={{ background: k.bg, color: k.color }}>
                {k.icon}
              </div>
            </div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Onboarding for new schools */}
      {data.totalStudents === 0 && (
        <div className="onboarding-card card-premium" style={{ marginBottom: 24 }}>
          <div className="onboarding-content">
            <h2 className="hero-title white">Get Started 🚀</h2>
            <p className="hero-subtitle white">Your school platform is ready. Let's set up your data.</p>
            <div className="onboarding-steps-grid">
              {[
                { n:1, title:'Add Teachers',  desc:'Register teaching staff first.',  to:'/teachers'  },
                { n:2, title:'Add Students',  desc:'Import learners into the system.', to:'/students'  },
                { n:3, title:'Setup Fees',    desc:'Configure fee structures.',        to:'/fees'      },
              ].map(s => (
                <div className="onboarding-step-glass" key={s.n}>
                  <div className="step-num-glow">{s.n}</div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                  <Link to={s.to} className="btn-white-sm" style={{ marginTop: 'auto' }}>Go →</Link>
                </div>
              ))}
            </div>
          </div>
          <div className="onboarding-bg-icon">📚</div>
        </div>
      )}

      {/* Main Grid — Recent Activity + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 24 }}>

        {/* Recent Activity / Payments */}
        <div className="card">
          <div className="card-header">
            <h3>🕐 Recent Activity</h3>
            {!isTeacher && <Link to="/fees" className="btn btn-ghost btn-sm">View All</Link>}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.recentPayments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📂</div>
                <p>No recent payments found.</p>
              </div>
            ) : (
              data.recentPayments.map((p, i) => (
                <div className="activity-item" key={i} style={{ padding: '11px 18px' }}>
                  <div className="activity-icon">💳</div>
                  <div className="activity-body">
                    <div className="activity-title">{p.studentName}</div>
                    <div className="activity-sub">{p.studentClass} · {p.method}</div>
                  </div>
                  <div className="activity-time">{p.date}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quickActions.map((a, i) => (
              <Link to={a.to} key={i} className="quick-action">
                <div className="quick-action-icon" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{a.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{a.sub}</div>
                </div>
                <div className="quick-action-plus">+</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CBC Structure */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="flex-center gap-3">
            <div className="icon-box-primary">🏫</div>
            <div>
              <h3 style={{ margin: 0 }}>CBC School Structure</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: 0 }}>Distributed across 4 Key Stages</p>
            </div>
          </div>
          <span className="badge badge-info">{data.totalStudents} Students</span>
        </div>
        <div className="card-body">
          <div className="cbc-structure-grid">
            {Object.entries(data.schoolStructure).map(([levelName, levelData]) => {
              const colors = levelColors[levelName] || levelColors['Early Years'];
              const icon   = levelIcons[levelName] || '📚';
              return (
                <div key={levelName} className="cbc-level-card-refined">
                  <div className="cbc-level-header-refined" style={{ background: colors.gradient }}>
                    <span className="cbc-level-icon-glow">{icon}</span>
                    <div>
                      <div className="cbc-level-name-alt">{levelName}</div>
                      <div className="cbc-level-count-alt">{levelData.totalStudents} Students</div>
                    </div>
                  </div>
                  <div className="cbc-grades-list-refined">
                    {Object.entries(levelData.grades).map(([grade, info]) => {
                      const perfColor = info.avgPerformance >= 70 ? 'var(--success)' : info.avgPerformance >= 50 ? 'var(--warning)' : 'var(--danger)';
                      return (
                        <div key={grade} className="cbc-grade-row-refined">
                          <span className="grade-indicator" style={{ background: colors.accent }} />
                          <span className="grade-name">{grade}</span>
                          <div className="grade-stats-box">
                            <span className="count-pill">{info.count} 👤</span>
                            {info.avgPerformance > 0 && (
                              <span className="perf-pill" style={{ borderColor: perfColor, color: perfColor }}>
                                {info.avgPerformance}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row — Attendance + Fee summary */}
      <div className="dashboard-grid-2">

        {/* Attendance */}
        {!isFinance && (
          <div className="card">
            <div className="card-header">
              <div className="flex-center gap-3">
                <div className="icon-box-orange">📋</div>
                <h3 style={{ margin: 0 }}>Today's Attendance</h3>
              </div>
              <Link to="/attendance" className="btn btn-ghost btn-sm">Mark Now</Link>
            </div>
            <div className="card-body">
              <div className="flex-around text-center" style={{ marginBottom: 20 }}>
                {[
                  { val: data.attendance.present, label: 'Present', color: 'var(--success)' },
                  { val: data.attendance.late,    label: 'Late',    color: 'var(--warning)' },
                  { val: data.attendance.absent,  label: 'Absent',  color: 'var(--danger)'  },
                ].map((s, i) => (
                  <div key={i} className="stat-group">
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="rate-circle-container">
                <div className="rate-circle" style={{ borderColor: data.attendance.percentage >= 90 ? 'var(--success)' : 'var(--warning)' }}>
                  <span className="rate-val">{data.attendance.percentage}%</span>
                  <span className="rate-label">Rate</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Overview */}
        {!isTeacher && (
          <div className="card">
            <div className="card-header">
              <div className="flex-center gap-3">
                <div className="icon-box-success">💰</div>
                <h3 style={{ margin: 0 }}>Fee Collection</h3>
              </div>
              <Link to="/fees" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            <div className="card-body">
              <div className="flex-around text-center" style={{ marginBottom: 20 }}>
                {[
                  { val: data.feeSummary.fullyPaid,   label: 'Fully Paid', color: 'var(--success)' },
                  { val: data.feeSummary.partialPaid, label: 'Partial',    color: 'var(--warning)' },
                  { val: data.feeSummary.unpaid,      label: 'Unpaid',     color: 'var(--danger)'  },
                ].map((s, i) => (
                  <div key={i} className="stat-group">
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="progress-container-lg">
                <div className="progress-fill-glow" style={{ width: `${data.collectionRate}%` }} />
              </div>
              <div className="flex-between" style={{ marginTop: 8 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 600 }}>
                  {data.collectionRate}% Collected
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {formatKSh(data.feeSummary.totalCollected)} of {formatKSh(data.feeSummary.totalExpected)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Performance by Level */}
        {!isFinance && Object.keys(data.schoolStructure).length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="flex-center gap-3">
                <div className="icon-box-accent">📊</div>
                <h3 style={{ margin: 0 }}>Academic Performance</h3>
              </div>
            </div>
            <div className="card-body">
              {Object.entries(data.schoolStructure).map(([levelName, levelData]) => {
                const colors  = levelColors[levelName] || levelColors['Early Years'];
                const allPerfs = Object.values(levelData.grades).map(g => g.avgPerformance).filter(p => p > 0);
                const levelAvg = allPerfs.length > 0 ? (allPerfs.reduce((a, b) => a + b, 0) / allPerfs.length).toFixed(1) : 0;
                const { grade, color } = getGrade(levelAvg, levelName);
                return (
                  <div key={levelName} className="metric-row">
                    <div className="flex-between" style={{ marginBottom: 6 }}>
                      <span className="metric-label">{levelIcons[levelName]} {levelName}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{levelAvg}% <small style={{ fontWeight: 500, opacity: 0.7 }}>({grade})</small></span>
                    </div>
                    <div className="progress-container-refined">
                      <div className="progress-fill-refined" style={{ width: `${levelAvg}%`, background: colors.gradient }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
