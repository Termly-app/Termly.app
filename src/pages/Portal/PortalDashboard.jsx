import React, { useState, useEffect } from 'react';
import { 
  LogoutIcon, BookIcon, CheckIcon, 
  MessageIcon, ActivityIcon, 
  CardIcon, UserIcon, HistoryIcon,
  TeacherIcon, ChevronRightIcon,
  ClockIcon
} from '../../components/CommonIcons';
import { 
  getAssignments, getStudentSubmissions, getStudentExamResults, 
  getFees, getGradeForScore, getSchoolProfile, initPortalStore,
  getStudentProfile, getAnnouncements, getSubjectDetails
} from '../../data/store';

// Premium UI Components
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ 
    background: '#ffffff', borderRadius: '24px', padding: '24px', 
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', 
    border: '1px solid rgba(255,255,255,0.4)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ...style 
  }}>
    {children}
  </div>
);

const Badge = ({ children, color = '#1a73e8', bg = '#eff6ff' }) => (
  <span style={{ 
    background: bg, color: color, padding: '6px 12px', 
    borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, 
    letterSpacing: '0.5px', textTransform: 'uppercase' 
  }}>
    {children}
  </span>
);

export default function PortalDashboard({ user, onLogout }) {
  const [localUser, setLocalUser] = useState(user);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  // Data states
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({});
  const [examResults, setExamResults] = useState([]);
  const [academic, setAcademic] = useState({ average: 0, grade: 'N/A', rank: '-', color: '#667781' });
  const [feeBalance, setFeeBalance] = useState(0);
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState(null);

  // M-Pesa state
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState(user.parent_phone || '');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [isSTKPushing, setIsSTKPushing] = useState(false);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isDesktop = windowWidth > 768;
  const isLargeDesktop = windowWidth > 992;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        initPortalStore(user.school_id || user.schoolId, user.id);

        const [profile, freshStudent, examRes, schoolNotices, teachers] = await Promise.all([
          getSchoolProfile().catch(() => null),
          getStudentProfile(user.id).catch(() => user),
          getStudentExamResults(user.id).catch(() => []),
          getAnnouncements(user.school_id || user.schoolId).catch(() => []),
          getSubjectDetails(user.id).catch(() => [])
        ]);
        
        setSchoolProfile(profile);
        if (freshStudent) setLocalUser(freshStudent);
        setSubjectTeachers(teachers);
        
        const asts = await getAssignments({}).catch(() => []);
        setAssignments(asts);
        setExamResults(examRes);
        setNotices(schoolNotices);
        
        const subs = await getStudentSubmissions(user.id).catch(() => []);
        const subMap = {};
        subs.forEach(s => { subMap[s.assignment_id] = s; });
        setMySubmissions(subMap);
        
        if (examRes.length > 0) {
          const avg = examRes.reduce((acc, curr) => acc + (curr.total_marks / (curr.total_subjects || 1)), 0) / examRes.length;
          const { grade, color } = getGradeForScore(avg, user.class, profile);
          setAcademic({ average: avg.toFixed(1), grade, color, rank: examRes[0].class_position });
        }

        const myFee = await getFees(user.id).catch(() => null);
        if (myFee) {
          setFeeBalance(myFee.balance || 0);
          setMpesaAmount((myFee.balance || 0) > 0 ? myFee.balance : 0);
          // Sort payments by date descending
          const sortedPayments = (myFee.payments || []).sort((a, b) => new Date(b.date) - new Date(a.date));
          setPayments(sortedPayments);
        }
      } catch (err) {
        console.error('Portal init failed:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  const handleMpesaPay = () => {
    setIsSTKPushing(true);
    setTimeout(() => {
      setIsSTKPushing(false);
      setShowMpesaModal(false);
      alert('Payment initiated. Please check your phone to enter your M-Pesa PIN.');
    }, 2000);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' at ' + 
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div className="animate-pulse" style={{ width: 50, height: 50, borderRadius: 25, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }} />
    </div>
  );

  return (
    <div style={{ width: '100%', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Desktop Wrapper */}
      <div style={{ 
        width: '100%', maxWidth: '1200px', margin: '0 auto', 
        display: 'flex', flexDirection: 'column', minHeight: '100vh' 
      }}>
        
        {/* Header */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', 
          padding: '20px 24px', position: 'sticky', top: 0, zIndex: 1000, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
              color: '#fff', width: 44, height: 44, borderRadius: '14px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '1.4rem', fontWeight: 700, boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
            }}>
              {localUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                {localUser.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                {schoolProfile?.name || 'Portal Access'}
              </div>
            </div>
          </div>
          <div onClick={onLogout} style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: isDesktop ? 'block' : 'none' }}>Logout</span>
            <LogoutIcon size={20} />
          </div>
        </div>

        {/* Main Content Layout */}
        <div style={{ display: 'flex', flex: 1 }}>
          
          {/* Desktop Sidebar Navigation */}
          <nav className="desktop-nav" style={{
            width: 260, padding: '32px 16px', borderRight: '1px solid rgba(0,0,0,0.05)',
            display: isDesktop ? 'flex' : 'none', flexDirection: 'column', gap: 8
          }}>
            {[
              { id: 'home', label: 'Dashboard', icon: ActivityIcon },
              { id: 'academics', label: 'Academics', icon: BookIcon },
              { id: 'fees', label: 'Finances', icon: CardIcon },
              { id: 'profile', label: 'Profile', icon: UserIcon }
            ].map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                  borderRadius: '16px', cursor: 'pointer',
                  background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                  color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  transition: 'all 0.2s ease'
                }}
              >
                <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                <span>{tab.label}</span>
              </div>
            ))}
          </nav>

          {/* Page Content */}
          <div style={{ flex: 1, padding: '32px 24px 100px', boxSizing: 'border-box' }}>
            
            {/* HOME TAB */}
            {activeTab === 'home' && (
              <div style={{ display: 'grid', gridTemplateColumns: isLargeDesktop ? 'repeat(2, 1fr)' : '1fr', gap: 24, animation: 'fadeIn 0.4s ease-out' }}>
                
                {/* Status Overview Card */}
                <div style={{ 
                  gridColumn: '1 / -1',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                  padding: '32px', borderRadius: '32px', color: '#fff',
                  boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.4)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', borderRadius: '50%' }} />
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
                    Active Term • {schoolProfile?.academic_year || '2026'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 32 }}>
                    <span style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>{localUser.class}</span>
                    {localUser.stream && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '24px', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>
                        {localUser.stream.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 8 }}>Fee Balance</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: feeBalance > 0 ? '#f87171' : '#34d399' }}>
                        KES {feeBalance.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 8 }}>Average Grade</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: academic.color !== '#667781' ? academic.color : '#fff' }}>
                        {academic.grade} ({academic.average}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Announcements Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 0 }}>School Updates</h3>
                  {notices.length === 0 ? (
                    <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <MessageIcon size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                      <div style={{ color: '#64748b', fontWeight: 600 }}>No announcements at the moment</div>
                    </Card>
                  ) : (
                    notices.map(n => (
                      <Card key={n.id} style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{n.title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6 }}>{n.body}</div>
                      </Card>
                    ))
                  )}
                </div>

                {/* Recent Activities/Results Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 0 }}>Recent Results</h3>
                  {examResults.slice(0, 3).map(res => (
                    <Card key={res.id} style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ background: '#eff6ff', color: '#3b82f6', padding: 12, borderRadius: 16 }}>
                          <ActivityIcon size={24} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{res.exams?.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{res.exams?.term}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: '#3b82f6', fontSize: '1.2rem' }}>{res.mean_score?.toFixed(1)}%</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Rank: {res.class_position}</div>
                      </div>
                    </Card>
                  ))}
                  {examResults.length === 0 && (
                    <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <ActivityIcon size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                      <div style={{ color: '#64748b', fontWeight: 600 }}>Results will appear here once released</div>
                    </Card>
                  )}
                </div>

              </div>
            )}

            {/* ACADEMICS TAB */}
            {activeTab === 'academics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.4s ease-out' }}>
                 
                 {/* Subjects Selection */}
                 <div>
                   <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Your Subjects</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                     {localUser.subjects?.map((sub, idx) => {
                       const tInfo = subjectTeachers.find(t => t.subject_name === sub);
                       return (
                         <Card 
                           key={idx} 
                           onClick={() => setSelectedSubjectDetail(tInfo || { subject_name: sub })}
                           style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', hover: { transform: 'translateY(-2px)' } }}
                         >
                           <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                             <div style={{ background: '#f8fafc', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                               <BookIcon size={22} />
                             </div>
                             <div>
                               <div style={{ fontWeight: 700, color: '#0f172a' }}>{sub}</div>
                               <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{tInfo ? tInfo.teacher_name : 'No teacher assigned'}</div>
                             </div>
                           </div>
                           <ChevronRightIcon size={18} color="#cbd5e1" />
                         </Card>
                       );
                     })}
                   </div>
                 </div>

                 <div>
                   <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Full Academic Performance</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {examResults.length === 0 ? (
                      <Card style={{ textAlign: 'center', padding: '60px 24px' }}>
                        <ActivityIcon size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                        <div style={{ color: '#64748b', fontWeight: 600, fontSize: '1.1rem' }}>No released results found</div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 8 }}>Please check back later once the administration publishes the results.</p>
                      </Card>
                    ) : (
                      examResults.map(res => (
                        <Card key={res.id} style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
                           <div style={{ flex: 1, minWidth: 200 }}>
                             <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem', marginBottom: 4 }}>{res.exams?.name}</div>
                             <div style={{ display: 'flex', gap: 8 }}>
                               <Badge bg="#e0e7ff" color="#4f46e5">{res.exams?.term}</Badge>
                               <Badge bg="#f1f5f9" color="#64748b">{res.exams?.exam_type}</Badge>
                             </div>
                           </div>
                           <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                             <div style={{ textAlign: 'center' }}>
                               <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Mean Score</div>
                               <div style={{ fontWeight: 900, color: '#3b82f6', fontSize: '1.8rem' }}>{res.mean_score?.toFixed(1)}%</div>
                             </div>
                             <div style={{ width: 1, height: 40, background: '#e2e8f0' }} />
                             <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Class Position</div>
                               <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem' }}>{res.class_position} / {res.class_size}</div>
                             </div>
                           </div>
                        </Card>
                      ))
                    )}
                   </div>
                 </div>
              </div>
            )}

            {/* FEES TAB */}
            {activeTab === 'fees' && (
              <div style={{ display: 'grid', gridTemplateColumns: isLargeDesktop ? '380px 1fr' : '1fr', gap: 32, animation: 'fadeIn 0.4s ease-out' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', 
                    borderRadius: '32px', padding: '40px 32px', color: '#fff', 
                    boxShadow: '0 12px 24px -8px rgba(236, 72, 153, 0.4)',
                    textAlign: 'center', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', left: -20, bottom: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
                      Current Balance
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 32, letterSpacing: '-1.5px' }}>
                      KES {feeBalance.toLocaleString()}
                    </div>
                    
                    <button 
                      onClick={() => setShowMpesaModal(true)}
                      style={{ 
                        width: '100%', background: '#fff', color: '#ec4899', border: 'none', 
                        padding: '18px', borderRadius: '20px', fontWeight: 800, fontSize: '1.15rem', 
                        cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      Make Payment
                    </button>
                  </div>

                  <Card style={{ padding: '24px' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800 }}>Financial Overview</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Billed Amount</span>
                        <span style={{ fontWeight: 700 }}>KES {(feeBalance + payments.reduce((a,b)=>a+b.amount, 0)).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Total Paid</span>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>KES {payments.reduce((a,b)=>a+b.amount, 0).toLocaleString()}</span>
                      </div>
                      <div style={{ height: 1, background: '#f1f5f9' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>Remaining</span>
                        <span style={{ fontWeight: 900, color: '#ec4899' }}>KES {feeBalance.toLocaleString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Payment History</h3>
                  {payments.length === 0 ? (
                    <Card style={{ textAlign: 'center', padding: '60px 24px' }}>
                      <HistoryIcon size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                      <div style={{ color: '#64748b', fontWeight: 600, fontSize: '1.1rem' }}>No transaction history found</div>
                    </Card>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {payments.map(p => (
                        <Card key={p.id} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', color: '#64748b' }}>
                              <CardIcon size={24} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{p.method}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                                <ClockIcon size={12} />
                                {formatDateTime(p.date)}
                                <span style={{ marginLeft: 8 }}>• {p.reference || 'Ref-N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 900, color: '#10b981', fontSize: '1.3rem' }}>
                            +{p.amount.toLocaleString()}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.4s ease-out' }}>
                <Card style={{ textAlign: 'center', padding: '48px 32px' }}>
                  <div style={{ 
                    width: 100, height: 100, borderRadius: '32px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: '#fff', fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
                  }}>
                    {localUser.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 style={{ margin: '0 0 8px', fontSize: '1.8rem', color: '#0f172a', fontWeight: 900 }}>{localUser.name}</h2>
                  <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '1.1rem', fontWeight: 600 }}>Admission Number: {localUser.adm_no}</p>
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <Badge bg="#e0e7ff" color="#4f46e5">Active Student</Badge>
                    {localUser.residence_type && <Badge bg="#fce7f3" color="#db2777">{localUser.residence_type}</Badge>}
                  </div>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: windowWidth > 600 ? '1fr 1fr' : '1fr', gap: 24 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Academic Profile</h3>
                    <Card style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Current Grade</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>{localUser.class}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Stream</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>{localUser.stream || 'General'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Curriculum</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>{localUser.class?.includes('Grade') ? 'CBC' : '8-4-4'}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Guardian Information</h3>
                    <Card style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Registered Phone</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>{localUser.parent_phone || 'Not Provided'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>SMS Alerts</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>Enabled</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Primary Guardian</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>Yes</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile-only Bottom Navigation */}
      <nav className="mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%', 
        background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', 
        display: isDesktop ? 'none' : 'flex', justifyContent: 'space-around',
        padding: '12px 0 calc(12px + env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(0,0,0,0.05)', zIndex: 1000
      }}>
        {[
          { id: 'home', label: 'Home', icon: ActivityIcon },
          { id: 'academics', label: 'Academics', icon: BookIcon },
          { id: 'fees', label: 'Fees', icon: CardIcon },
          { id: 'profile', label: 'Profile', icon: UserIcon }
        ].map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, 
              color: activeTab === tab.id ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer', flex: 1
            }}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span style={{ fontSize: '0.65rem', fontWeight: activeTab === tab.id ? 700 : 600 }}>{tab.label}</span>
          </div>
        ))}
      </nav>

      {/* Subject Detail Modal */}
      {selectedSubjectDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 400, borderRadius: 32, padding: 32, animation: 'fadeIn 0.3s ease-out', position: 'relative' }}>
            <button 
              onClick={() => setSelectedSubjectDetail(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ 
                width: 72, height: 72, borderRadius: 24, background: '#f1f5f9',
                margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
              }}>
                <TeacherIcon size={32} />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 900 }}>{selectedSubjectDetail.subject_name}</h3>
              <p style={{ color: '#64748b', fontWeight: 600 }}>Assigned Teacher</p>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                {selectedSubjectDetail.teacher_name?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{selectedSubjectDetail.teacher_name || 'Not assigned'}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Subject Instructor</div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedSubjectDetail(null)}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: '24px 24px 40px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: 48, height: 5, background: '#e2e8f0', borderRadius: 3, margin: '0 auto 24px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>M-Pesa Express</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.95rem' }}>Push an STK prompt to your phone to complete the transaction instantly.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Amount (KES)</label>
                <input 
                  type="number" 
                  value={mpesaAmount} 
                  onChange={(e) => setMpesaAmount(e.target.value)}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', boxSizing: 'border-box', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>M-Pesa Number</label>
                <input 
                  type="text" 
                  value={mpesaPhone} 
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', boxSizing: 'border-box', fontSize: '1.1rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  onClick={() => setShowMpesaModal(false)}
                  style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleMpesaPay}
                  disabled={isSTKPushing}
                  style={{ flex: 2, padding: '16px', borderRadius: '16px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: isSTKPushing ? 0.7 : 1, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                >
                  {isSTKPushing ? 'Sending Prompt...' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        input:focus {
          border-color: #3b82f6 !important;
        }
        @media (min-width: 769px) {
          .mobile-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
