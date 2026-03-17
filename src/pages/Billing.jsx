import { useState, useEffect } from 'react';
import { getSchoolProfile, submitPayment, getPayments, checkIsSubscriptionActive, getPlatformSettings, updateSchoolPlan, cancelSubscription } from '../data/store';

export default function Billing() {
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('3000');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await getSchoolProfile();
      setProfile(p);
      const pay = await getPayments();
      setPayments(pay);
      const s = await getPlatformSettings();
      setSettings(s);
      // Set default amount based on plan
      if (p.subscriptionPlan) {
        const planPrice = s.pricing?.[p.subscriptionPlan]?.price || 4999;
        setAmount(planPrice.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code) return;
    
    // M-PESA Validation
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(cleanCode)) {
      setMessage({ type: 'error', text: 'Invalid M-PESA code. It must be exactly 10 alphanumeric characters.' });
      return;
    }

    setSubmitting(true);
    try {
      await submitPayment(Number(amount), cleanCode);
      setMessage({ type: 'success', text: 'Payment submitted! Please wait for manual verification.' });
      setCode('');
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchPlan = async (newPlan) => {
    if (!profile) return;
    setSwitching(true);
    try {
      await updateSchoolPlan(profile.schoolId, newPlan);
      setMessage({ type: 'success', text: `Successfully switched to ${newPlan} plan!` });
      setShowSwitchModal(false);
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSwitching(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? This will restrict your access immediately.')) return;
    try {
      await cancelSubscription();
      setMessage({ type: 'success', text: 'Subscription canceled.' });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Move hooks to top to avoid Error #310
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkActive = async () => {
      if (profile) {
        const active = await checkIsSubscriptionActive(profile);
        setIsActive(active);
      }
    };
    checkActive();
  }, [profile]);

  if (loading) return (
    <div className="flex-center" style={{ minHeight: 400 }}>
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Subscription & Billing</h2>
            <p>Manage your school's platform access and payments</p>
          </div>
          <div className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.85rem', padding: '10px 18px', animation: !isActive ? 'pulse 2s infinite' : 'none' }}>
            {isActive ? '● ACTIVE SUBSCRIPTION' : '● ACCESS RESTRICTED'}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Status Card */}
        <div className="card glass-premium">
          <div className="card-header">
            <h3>💎 Plan Overview</h3>
          </div>
          <div className="card-body">
            <div style={{ 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '20px', 
              padding: '24px', 
              marginBottom: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 20
            }}>
              <div style={{ 
                height: 64, 
                width: 64, 
                borderRadius: '16px', 
                background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '1.75rem',
                boxShadow: isActive ? '0 10px 20px rgba(79, 70, 229, 0.3)' : 'none'
              }}>
                {isActive ? '⚡' : '🔒'}
              </div>
              <div>
                <h4 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>
                  {profile.subscriptionPlan?.toUpperCase() || 'STARTER'}
                </h4>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', fontWeight: 500 }}>
                    {profile.subscriptionExpiry 
                      ? `Valid until ${new Date(profile.subscriptionExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : 'No active subscription'}
                  </p>
                </div>
              </div>
            </div>

            {!isActive && (
              <div className="badge badge-danger" style={{ 
                width: '100%', 
                padding: '16px', 
                marginBottom: '24px', 
                display: 'flex', 
                gap: 12, 
                alignItems: 'center',
                textAlign: 'left',
                whiteSpace: 'normal',
                lineHeight: 1.4
              }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Access Restricted</div>
                  <div style={{ opacity: 0.9, fontSize: '0.85rem' }}>Your school's access has been limited. Renew your subscription to restore full functionality.</div>
                </div>
              </div>
            )}

            <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ opacity: 0.6 }}>School Identity:</span>
                <span style={{ fontWeight: 600 }}>{profile?.school_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>Billing Cycle:</span>
                <span className="badge badge-info">TERMLY</span>
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: '#D4506A', fontSize: '0.75rem', fontWeight: 500, opacity: 0.6, cursor: 'pointer' }}>
                  Cancel subscription
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="card glass-premium" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'var(--primary)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }}></div>
          
          <div className="card-header">
            <h3>🎯 Renew Now</h3>
          </div>
          <div className="card-body">
            <div style={{ 
              background: 'linear-gradient(145deg, var(--bg-sidebar) 0%, #1a1f2e 100%)', 
              color: 'white', 
              borderRadius: '20px', 
              padding: '28px', 
              marginBottom: '28px',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 15px 35px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0DD88A', boxShadow: '0 0 10px #0DD88A' }}></div>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.9 }}>M-PESA PAYMENT GUIDE</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--primary), #5B3ED4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 12px rgba(124, 92, 252, 0.4)' }}>1</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{settings?.billing?.instructions || `Navigate to your M-PESA menu, select Paybill, and send KSh ${Number(amount).toLocaleString()} to Business No: ${settings?.billing?.mpesa_number || '07XXXXXXXX'}`}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, flexShrink: 0 }}>2</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Wait for the MPESA confirmation SMS containing your unique 10-character code.</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px dashed rgba(13, 216, 138, 0.3)' }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(13, 216, 138, 0.1)', color: '#0DD88A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, flexShrink: 0 }}>3</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0DD88A' }}>Enter the 10-character alphanumeric transaction code below.</p>
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div className={`badge ${message.type === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ width: '100%', padding: '12px', marginBottom: '20px', textAlign: 'center' }}>
                {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>Transaction Code</label>
                <div style={{ position: 'relative', marginTop: 8 }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>#</span>
                  <input 
                    type="text" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="QHG7S2L9K"
                    className="input"
                    style={{ paddingLeft: 40, letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}
                    required
                    maxLength={10}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '18px', fontSize: '1.1rem', fontWeight: 700 }}
                disabled={submitting || !code}
              >
                {submitting ? 'PROCESSING...' : 'ACTIVATE MY ACCOUNT 🚀'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="card glass-premium" style={{ marginTop: 32 }}>
        <div className="card-header">
          <h3>📜 Transaction History</h3>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Submission Date</th>
                <th>Ref Code</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}>📂</span>
                    No payments found in our records
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                    <td><code style={{ background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', fontBold: 700 }}>{p.transaction_code}</code></td>
                    <td style={{ fontWeight: 700 }}>KSh {Number(p.amount).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${
                        p.status?.toLowerCase() === 'approved' ? 'badge-success' :
                        p.status?.toLowerCase() === 'pending' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="footer" style={{ marginTop: 24, textAlign: 'center', fontSize: '0.75rem', opacity: 0.5 }}>
          ShuleSoft Billing System · Secure Payments via M-PESA
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>🚀</span> Available Subscription Plans
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: 24 
        }}>
          {settings?.pricing && Object.entries(settings.pricing)
            .filter(([_, p]) => p.active !== false)
            .map(([id, p]) => (
            <div key={id} style={{ 
              background: profile?.subscriptionPlan === id ? 'rgba(79, 70, 229, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${profile?.subscriptionPlan === id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '24px',
              padding: '32px',
              transition: 'all 0.3s ease',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {profile?.subscriptionPlan === id && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 800 }}>CURRENT</div>
              )}
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px 0' }}>{id}</h4>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', margin: '12px 0' }}>
                KSh {p.price?.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.5 }}>/ term</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', flex: 1 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem', opacity: 0.8 }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 900 }}>✓</span> Up to {p.limit?.toLocaleString()} students
                </li>
                {p.features?.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem', opacity: 0.8 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 900 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button 
                disabled={profile?.subscriptionPlan === id || switching}
                onClick={() => handleSwitchPlan(id)}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '12px', 
                  background: profile?.subscriptionPlan === id ? 'rgba(79, 70, 229, 0.1)' : 'var(--primary)',
                  color: profile?.subscriptionPlan === id ? 'var(--primary)' : 'white',
                  fontWeight: 800,
                  border: profile?.subscriptionPlan === id ? '1px solid var(--primary)' : 'none',
                  cursor: profile?.subscriptionPlan === id ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {switching ? 'Updating Plan...' : profile?.subscriptionPlan === id ? '✓ Active Selection' : 'Choose Plan'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 64, opacity: 0.5, textAlign: 'center', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 0' }}>
        <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.7, fontWeight: 500 }}>
          Cancel platform subscription
        </button>
      </div>
    </div>
  );
}
