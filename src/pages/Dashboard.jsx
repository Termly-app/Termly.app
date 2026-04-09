import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  getStudents, getFeeSummary, getAttendanceSummary, getTodayStr,
  getFees, getSchoolStructure, getTeachers, getSchoolProfile,
  getMarks, getAttendance, subscribeToChanges, getUsers, getPlatformSettings,
  getPeriods, setActivePeriod, checkIsSubscriptionActive
} from '../data/store';
import Loader from '../components/Common/Loader';
import {
  StudentIcon, TeacherIcon, CardIcon, BookIcon, UserIcon, SchoolIcon,
  RocketIcon, AlertIcon, LogoutIcon, ClockIcon, SearchIcon, DashboardIcon,
  LeafIcon, GraduationIcon, ChevronDownIcon, CheckIcon, CloseIcon, PlatformZapIcon
} from '../components/CommonIcons';
import SetupWizard from '../components/SetupWizard';
import ReferralTool from '../components/ReferralTool';
import { Helmet } from 'react-helmet-async';
import Select from '../components/Common/Select';

export default function Dashboard({ currentUser, onLogout, currentPeriodId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [isAccountActive, setIsAccountActive] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, academics, finance
  const [hideIntel, setHideIntel] = useState(sessionStorage.getItem('hide_intel') === 'true');

  useEffect(() => {
    const loadData = async () => {
      try {
        const wrap = (p, fb = []) => p.catch(e => { console.error(e); return fb; });
        const [students, fees, marks, teachers, profile, attendance, adminUsers, platformSettings, allPeriods] = await Promise.all([
          wrap(getStudents()), wrap(getFees(), {}), wrap(getMarks(), {}), wrap(getTeachers()), 
          wrap(getSchoolProfile(), {}), wrap(getAttendance(), {}), wrap(getUsers()), 
          wrap(getPlatformSettings(), {}), wrap(getPeriods())
        ]);
        
        const prof = profile || {};
        const active = await wrap(checkIsSubscriptionActive(prof), true);
        setIsAccountActive(active);
        setPeriods(allPeriods || []);

        const todayStr = getTodayStr();
        const [feeSummary, todayAtt, schoolStructure] = await Promise.all([
          wrap(getFeeSummary(fees, students, prof), { totalExpected:0, totalCollected:0, totalOutstanding:0, fullyPaid:0, partialPaid:0, unpaid:0 }),
          wrap(getAttendanceSummary(todayStr, attendance), { present:0, late:0, absent:0, total:0, percentage:0 }),
          wrap(getSchoolStructure(students, marks, prof), {})
        ]);
        const allPayments = [];
        students.forEach(s => {
          const f = fees[s.id];
          if (f?.payments) f.payments.forEach(p => allPayments.push({ ...p, studentName: s.name, studentClass: s.class }));
        });
        allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        const collectionRate = feeSummary.totalExpected > 0
          ? ((feeSummary.totalCollected / feeSummary.totalExpected) * 100).toFixed(1) : 0;
        const newData = {
          totalStudents: students.length, totalTeachers: teachers.length,
          collectionRate: Number(collectionRate), feeSummary,
          attendance: todayAtt, recentPayments: allPayments.slice(0, 5),
          schoolStructure, profile: prof, adminUsers: adminUsers || [], platformSettings: platformSettings || {},
        };
        setData(newData);
        setShowWizard(newData.totalStudents === 0 && !prof?.phone);
      } catch (err) {
        console.error(err);
        setData({
          totalStudents: 0, totalTeachers: 0, collectionRate: 0,
          feeSummary: { totalExpected:0, totalCollected:0, totalOutstanding:0, fullyPaid:0, partialPaid:0, unpaid:0 },
          attendance: { present:0, late:0, absent:0, total:0, percentage:0 },
          recentPayments: [], schoolStructure: {}, profile: {},
          adminUsers: [], platformSettings: {}
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
      subscribeToChanges('marks', loadData),
      subscribeToChanges('users', loadData)
    ];
    return () => {
      unsubs.forEach(u => u());
    };
  }, [currentPeriodId, currentUser]);

  // Platform admins are handled at the router level in App.jsx.
  // This component is only rendered for school users.

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
  const levelIcons = { 
    'Early Years':      <LeafIcon size={14} />,
    'Upper Primary':    <BookIcon size={14} />,
    'Junior Secondary': <GraduationIcon size={14} />,
    'Senior Secondary': <RocketIcon size={14} /> 
  };

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

  const plan = data.profile?.subscription_plan || data.profile?.subscriptionPlan || 'Starter Plan';
  const pricing = data.platformSettings?.pricing || {};
  const planKey = Object.keys(pricing).find(k => k.toLowerCase() === plan.toLowerCase());
  const seatLimit = planKey ? (pricing[planKey].admins || 5) : 5;
  const totalStaff = data.adminUsers?.length || 0;
  
  const kpis = [
    { icon:<StudentIcon size={20} />, label:'Total Students',    value: data.totalStudents,       color:'#0EA5E9', bg:'#E0F2FE',  show: true          },
    { icon:<TeacherIcon size={20} />, label:'Teaching Staff',    value: data.totalTeachers,       color:'#8B5CF6', bg:'#F5F3FF',  show: !isFinance     },
    { icon:<CardIcon size={20} />,    label:'Fee Collection',      value: `${data.collectionRate}%`, color:'#10B981', bg:'#ECFDF5',  show: !isTeacher     },
    { icon:<BookIcon size={20} />,    label:"Today's Attendance", value: `${data.attendance.percentage}%`, color:'#F59E0B', bg:'#FFFBEB', show: !isFinance },
    { icon:<UserIcon size={20} />,    label:'Seat Usage',        value: `${totalStaff}/${seatLimit}`, color:'#64748b', bg:'#f1f5f9', show: !isTeacher && !isFinance },
  ].filter(k => k.show);

  const quickActions = [
    { icon:<StudentIcon size={18} />, label:'Students',      sub:'Manage all students',   to:'/students',   bg:'#E0F2FE',  color:'#0EA5E9', feature: 'Student Management' },
    { icon:<TeacherIcon size={18} />, label:'Teachers',      sub:'Manage staff',          to:'/teachers',   bg:'#F5F3FF',  color:'#8B5CF6', feature: 'Staff Management' },
    { icon:<BookIcon size={18} />,    label:'Attendance',     sub:'Record daily attendance', to:'/attendance', bg:'#ECFDF5',  color:'#10B981', feature: 'Attendance Tracking' },
    { icon:<CardIcon size={18} />,    label:'Fees',           sub:'Fee collection & tracking', to:'/fees',    bg:'#FFFBEB',  color:'#F59E0B', feature: 'Student Fee Statements' },
    { icon:<BookIcon size={18} />,    label:'Timetable',      sub:'Automated scheduler',    to:'/timetable',  bg:'#F5F3FF',  color:'#6D28D9', feature: 'Timetable Builder' },
    { icon:<RocketIcon size={18} />,  label:'NEMIS Export',  sub:'Ministry data upload',   to:'/dashboard',  bg:'#FFF1F2',  color:'#BE123C', feature: 'NEMIS Data Export' },
  ];

  // Helper to check if a feature is included in the current plan
  const hasAccess = (featureName) => {
    if (!featureName) return true;
    const planName = data.profile?.subscriptionPlan || 'Starter Plan';
    const plan = data.platformSettings?.pricing?.[planName];
    if (!plan?.features) return false;
    return plan.features.some(f => f.toLowerCase().includes(featureName.toLowerCase()));
  };

  return (
    <div className="animate-fade-up">
      <Helmet>
        <title>Dashboard | ShuleSoft — High Performance School Management</title>
        <meta name="description" content="View school-wide performance, student count, and attendance at a glance." />
      </Helmet>
      {showWizard && (
        <SetupWizard 
          profile={data.profile} 
          totalStudents={data.totalStudents} 
          onComplete={() => {
            setShowWizard(false);
            navigate('/billing');
          }} 
        />
      )}

      {/* PREMIUM HUD */}
      <div className="premium-hud glass animate-slide-down">
        <div className="hud-left">
          <div className="school-pill">
            <SchoolIcon size={14} />
            <span>{data.profile?.schoolName || 'Institution'}</span>
          </div>
          <h1 className="hud-title">Intelligence Center</h1>
          <p className="hud-sub">Command and Control for the {currentPeriodId ? periods.find(p => p.id === currentPeriodId)?.year : 'current'} Academic Cycle.</p>
        </div>
        
        <div className="hud-right">
          <div className="hud-period-wrap">
            <div className="hud-period-lbl">Academic Period</div>
            <select
              className="hud-period-select"
              value={currentPeriodId || ''}
              onChange={(e) => setActivePeriod(e.target.value)}
            >
              <option value="">Select Period</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.year} — Term {p.term}{p.is_active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={12} className="hud-chevron" />
          </div>
          <div className="hud-divider" />
          <div className="hud-user">
            <div className="hud-user-info">
              <span className="hud-user-name">{currentUser?.name || 'Admin'}</span>
              <span className="hud-user-role">{currentUser?.role || 'Staff'}</span>
            </div>
            <div className="hud-avatar">{currentUser?.name?.charAt(0)}</div>
          </div>
        </div>
      </div>

      {/* ACTIONABLE INTELLIGENCE PANEL (Optional/Dismissible) */}
      {!hideIntel && (
        <div className="intel-panel animate-pop">
          <div className="intel-header">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <PlatformZapIcon size={18} />
              <span>Actionable Intel</span>
            </div>
            <button 
              className="intel-dismiss" 
              onClick={() => {
                setHideIntel(true);
                sessionStorage.setItem('hide_intel', 'true');
              }}
              title="Dismiss Intelligence Hub"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        <div className="intel-scroll">
          {data.attendance.absent > 0 && (
            <div className="intel-task warning" onClick={() => navigate('/communications')}>
              <div className="task-ico"><AlertIcon size={16} /></div>
              <div className="task-body">
                <div className="task-t">{data.attendance.absent} Students Absent today</div>
                <div className="task-d">Notify parents via SMS/WhatsApp with one click.</div>
              </div>
              <button className="task-btn">Dispatch Notifications</button>
            </div>
          )}
          {data.feeSummary.totalOutstanding > 0 && (
            <div className="intel-task danger" onClick={() => navigate('/fees')}>
              <div className="task-ico"><CardIcon size={16} /></div>
              <div className="task-body">
                <div className="task-t">Outstanding Fees: {formatKSh(data.feeSummary.totalOutstanding)}</div>
                <div className="task-d">Targeting 42 families for fee reconciliation.</div>
              </div>
              <button className="task-btn">Collect Payments</button>
            </div>
          )}
          {data.totalStudents === 0 && (
            <div className="intel-task primary" onClick={() => navigate('/students')}>
              <div className="task-ico"><StudentIcon size={16} /></div>
              <div className="task-body">
                <div className="task-t">Setup ShuleSoft for this term</div>
                <div className="task-d">Bulk import students to enable academic tracking.</div>
              </div>
              <button className="task-btn">Import CSV</button>
            </div>
          )}
          <div className="intel-task success">
            <div className="task-ico"><CheckIcon size={16} /></div>
            <div className="task-body">
              <div className="task-t">Exam Results Ready</div>
              <div className="task-d">Class teachers have finished grading CAT 1.</div>
            </div>
            <button className="task-btn">View Reports</button>
          </div>
        </div>
      </div>
      )}

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


      {/* Main Grid — Recent Activity + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 24 }}>

        {/* Recent Activity / Payments */}
        <div className="card">
          <div className="card-header">
            <h3><ClockIcon size={18} /> Recent Activity</h3>
            {!isTeacher && <Link to="/fees" className="btn btn-ghost btn-sm">View All</Link>}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.recentPayments.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon" style={{ marginBottom: 12, opacity: 0.5 }}><CardIcon size={40} /></div>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem' }}>No fee payments recorded this term.</p>
                <Link to="/fees" className="btn btn-primary btn-sm">
                  Record First Payment
                </Link>
              </div>
            ) : (
              data.recentPayments.map((p, i) => (
                <div className="activity-item" key={i} style={{ padding: '11px 18px' }}>
                  <div className="activity-icon"><CardIcon size={18} /></div>
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
            <h3><RocketIcon size={18} /> Quick Actions</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quickActions
              .filter(a => hasAccess(a.feature))
              .map((a, i) => (
                <Link 
                  to={a.to} 
                  key={i} 
                  className="quick-action"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="quick-action-icon" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', display:'flex', alignItems:'center', gap:8 }}>
                      {a.label}
                    </div>
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
            <div className="icon-box-primary"><SchoolIcon size={20} /></div>
            <div>
              <h3 style={{ margin: 0 }}>CBC School Structure</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: 0 }}>Distributed across 4 Key Stages</p>
            </div>
          </div>
          <span className="badge badge-info">{data.totalStudents} Students</span>
        </div>
        <div className="card-body">
            {Object.keys(data.schoolStructure).length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div className="empty-state-icon" style={{ marginBottom: 16, opacity: 0.5 }}><StudentIcon size={64} /></div>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Your School is Empty</h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 300, marginInline: 'auto' }}>
                  Add your students to sessions to see the CBC structure and academic analytics.
                </p>
                <Link to="/students" className="btn btn-primary">
                  + Add Students Now
                </Link>
              </div>
            ) : (
              <div className="cbc-structure-grid">
                {Object.entries(data.schoolStructure).map(([levelName, levelData]) => {
                  const colors = levelColors[levelName] || levelColors['Early Years'];
                  const icon   = levelIcons[levelName] || <BookIcon size={14} />;
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
                                <span className="count-pill" style={{ display:'flex', alignItems:'center', gap:4 }}>{info.count} <UserIcon size={10} /></span>
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
            )}
        </div>
      </div>

      {/* Bottom row — Attendance + Fee summary */}
      <div className="dashboard-grid-2">

        {/* Attendance (Modified for SVG Analytics) */}
        {!isFinance && (
          <div className="card glass-premium">
            <div className="card-header-v2">
              <div className="flex-center gap-3">
                <div className="ico-box att"><BookIcon size={18} /></div>
                <h3 className="card-h">Attendance Pulse</h3>
              </div>
              <Link to="/attendance" className="btn-v2">Log Entry</Link>
            </div>
            <div className="card-body-v2">
              <div className="analytics-box">
                <div className="svg-ring-container">
                    <svg viewBox="0 0 36 36" className="circular-chart orange">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circle" strokeDasharray={`${data.attendance.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <text x="18" y="20.35" className="percentage">{data.attendance.percentage}%</text>
                    </svg>
                </div>
                <div className="stat-pills">
                  <div className="stat-p-item">
                    <div className="v">{data.attendance.present}</div>
                    <div className="l">Present</div>
                  </div>
                  <div className="stat-p-item">
                    <div className="v red">{data.attendance.absent}</div>
                    <div className="l">Absent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Overview (Modified for SVG Analytics) */}
        {!isTeacher && (
          <div className="card glass-premium">
            <div className="card-header-v2">
              <div className="flex-center gap-3">
                <div className="ico-box fee"><CardIcon size={18} /></div>
                <h3 className="card-h">Financial Health</h3>
              </div>
              <Link to="/fees" className="btn-v2">Ledger</Link>
            </div>
            <div className="card-body-v2">
              <div className="analytics-box">
                <div className="svg-ring-container">
                    <svg viewBox="0 0 36 36" className="circular-chart success">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circle" strokeDasharray={`${data.collectionRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <text x="18" y="20.35" className="percentage">{data.collectionRate}%</text>
                    </svg>
                </div>
                <div className="stat-pills">
                  <div className="stat-p-item">
                    <div className="v">{formatKSh(data.feeSummary.totalCollected)}</div>
                    <div className="l">Collected</div>
                  </div>
                  <div className="stat-p-item">
                    <div className="v gold">{formatKSh(data.feeSummary.totalOutstanding)}</div>
                    <div className="l">Pending</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance by Level (Premium Refinement) */}
        {!isFinance && Object.keys(data.schoolStructure).length > 0 && (
          <div className="card glass-premium">
            <div className="card-header-v2">
              <div className="flex-center gap-3">
                <div className="ico-box perf"><DashboardIcon size={18} /></div>
                <h3 className="card-h">Academic Velocity</h3>
              </div>
            </div>
            <div className="card-body-v2 px-4 pb-4">
              {Object.entries(data.schoolStructure).map(([levelName, levelData]) => {
                const colors  = levelColors[levelName] || levelColors['Early Years'];
                const allPerfs = Object.values(levelData.grades).map(g => g.avgPerformance).filter(p => p > 0);
                const levelAvg = allPerfs.length > 0 ? (allPerfs.reduce((a, b) => a + b, 0) / allPerfs.length).toFixed(1) : 0;
                const { grade, color } = getGrade(levelAvg, levelName);
                return (
                  <div key={levelName} className="metric-v2">
                    <div className="metric-head">
                      <span className="m-lbl">{levelName}</span>
                      <span className="m-val" style={{ color }}>{levelAvg}% <span className="m-grd">{grade}</span></span>
                    </div>
                    <div className="m-bar-bg">
                      <div className="m-bar-fill" style={{ width: `${levelAvg}%`, background: colors.gradient }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* SaaS Growth: Referral Tool */}
      <div className="animate-fade-up" style={{ marginBottom: 40 }}>
        <ReferralTool />
      </div>

      <style>{`
        .glass-premium { background: var(--glass-surface); border: 1.5px solid var(--glass-border); border-radius: 20px; box-shadow: var(--shadow-xl); overflow: hidden; }
        
        .premium-hud { background: #050505; padding: 32px; border-radius: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border: 1.5px solid rgba(255,255,255,0.05); }
        .school-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(91,62,245,0.1); color: #5b3ef5; padding: 4px 12px; border-radius: 100px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .hud-title { font-size: 2rem; font-weight: 900; margin: 0; letter-spacing: -0.02em; color: #fff; }
        .hud-sub { font-size: 0.9rem; color: #71717a; margin: 6px 0 0; }
        
        .hud-right { display: flex; align-items: center; gap: 32px; }
        .hud-period-wrap { position: relative; }
        .hud-period-lbl { font-size: 0.6rem; font-weight: 800; color: #52525b; text-transform: uppercase; margin-bottom: 4px; }
        .hud-period-select { background: #121212; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 32px 8px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; outline: none; appearance: none; }
        .hud-chevron { position: absolute; right: 12px; top: 22px; color: #71717a; pointer-events: none; }
        .hud-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.05); }
        .hud-user { display: flex; align-items: center; gap: 16px; }
        .hud-user-info { text-align: right; }
        .hud-user-name { display: block; font-size: 0.9rem; font-weight: 800; color: #fff; }
        .hud-user-role { display: block; font-size: 0.7rem; color: #71717a; font-weight: 600; text-transform: capitalize; }
        .hud-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #5b3ef5, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 900; color: #fff; border: 2px solid rgba(255,255,255,0.1); }
        
        .intel-panel { background: #121212; border-radius: 20px; padding: 24px; border: 1.5px solid rgba(255,255,255,0.05); margin-bottom: 24px; }
        .intel-header { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; font-weight: 900; text-transform: uppercase; color: #71717a; margin-bottom: 20px; letter-spacing: 0.05em; }
        .intel-dismiss { background: transparent; border: none; color: #3f3f46; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s; }
        .intel-dismiss:hover { background: rgba(255,255,255,0.05); color: #e11d48; }
        .intel-scroll { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        
        .intel-task { min-width: 320px; flex: 1; display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 16px; cursor: pointer; transition: all 0.2s; position: relative; }
        .intel-task:hover { filter: brightness(1.1); transform: translateY(-2px); }
        .intel-task.primary { background: linear-gradient(to right, rgba(91,62,245,0.1), transparent); border: 1.5px solid rgba(91,62,245,0.15); }
        .intel-task.warning { background: linear-gradient(to right, rgba(245,158,11,0.1), transparent); border: 1.5px solid rgba(245,158,11,0.15); }
        .intel-task.danger { background: linear-gradient(to right, rgba(225,29,72,0.1), transparent); border: 1.5px solid rgba(225,29,72,0.15); }
        .intel-task.success { background: linear-gradient(to right, rgba(13,216,138,0.1), transparent); border: 1.5px solid rgba(13,216,138,0.15); }
        
        .task-ico { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .primary .task-ico { background: #5b3ef5; color: #fff; }
        .warning .task-ico { background: #f59e0b; color: #000; }
        .danger .task-ico { background: #e11d48; color: #fff; }
        .success .task-ico { background: #0dd88a; color: #fff; }
        
        .task-body { flex: 1; }
        .task-t { font-size: 0.9rem; font-weight: 800; color: #fff; }
        .task-d { font-size: 0.75rem; color: #71717a; margin-top: 2px; }
        .task-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .intel-task:hover .task-btn { background: #fff; color: #000; }
        
        .card-header-v2 { display: flex; justify-content: space-between; align-items: center; padding: 24px 24px 12px; }
        .card-h { font-size: 1.1rem; font-weight: 800; color: #fff; margin: 0; }
        .btn-v2 { font-size: 0.75rem; font-weight: 800; color: #5b3ef5; text-decoration: none; padding: 6px 12px; border-radius: 8px; background: rgba(91,62,245,0.05); transition: all 0.2s; }
        .btn-v2:hover { background: #5b3ef5; color: #fff; }
        
        .analytics-box { display: flex; align-items: center; gap: 32px; padding: 12px 24px 24px; }
        .svg-ring-container { width: 100px; height: 100px; position: relative; }
        .circular-chart { display: block; margin: 0 auto; max-width: 100%; max-height: 100%; }
        .circle-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 3.8; }
        .circle { fill: none; stroke-width: 3.8; stroke-linecap: round; animation: progress 1s ease-out forwards; }
        .circular-chart.orange .circle { stroke: #f59e0b; }
        .circular-chart.success .circle { stroke: #0dd88a; }
        .percentage { fill: #fff; font-family: inherit; font-size: 0.55rem; text-anchor: middle; font-weight: 900; }
        @keyframes progress { 0% { stroke-dasharray: 0 100; } }
        
        .stat-pills { display: flex; flex-direction: column; gap: 16px; flex: 1; }
        .stat-p-item { position: relative; padding-left: 16px; border-left: 2px solid rgba(255,255,255,0.1); }
        .stat-p-item .v { font-size: 1.25rem; font-weight: 900; color: #fff; }
        .stat-p-item .v.red { color: #e11d48; }
        .stat-p-item .v.gold { color: #f59e0b; }
        .stat-p-item .l { font-size: 0.7rem; color: #71717a; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
        
        .metric-v2 { margin-bottom: 20px; }
        .metric-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .m-lbl { font-size: 0.85rem; font-weight: 800; color: #a1a1aa; }
        .m-val { font-size: 0.9rem; font-weight: 900; }
        .m-grd { font-size: 0.7rem; opacity: 0.6; font-weight: 600; margin-left: 4px; }
        .m-bar-bg { height: 8px; background: #1a1a1a; border-radius: 100px; overflow: hidden; }
        .m-bar-fill { height: 100%; border-radius: 100px; }

        @media (max-width: 1024px) {
          .command-grid { grid-template-columns: 1fr; }
          .premium-hud { flex-direction: column; align-items: flex-start; gap: 24px; }
          .hud-right { width: 100%; justify-content: space-between; }
        }
        
        .animate-slide-down { animation: slideDown 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
