import React, { useState, useEffect } from 'react';
import { 
  getOrphanedMpesaCallbacks, 
  getStudents, 
  reconcileMpesaPayment,
  autoProcessMpesaCallbacks,
  simulateMpesaCallback
} from '../data/store';
import { 
  PaymentsIcon, 
  SearchIcon, 
  UserIcon, 
  CheckIcon, 
  AlertIcon,
  ClockIcon,
  PlatformZapIcon,
  RefreshIcon
} from '../components/CommonIcons';
import Loader from '../components/Common/Loader';


export default function MpesaReconciliation({ currentUser }) {
  const PAYMENT_STATUS_COLORS = {
    pending: '#F59E0B',
    orphaned: '#EF4444',
    failed: '#9CA3AF',
    processed: '#10B981'
  };
  const [callbacks, setCallbacks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCallback, setSelectedCallback] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simForm, setSimForm] = useState({ amount: '', phone: '', admNo: '' });
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadData();

    // Listen for auto-processing events
    const handleStart = () => setAutoProcessing(true);
    const handleEnd = (e) => {
      setAutoProcessing(false);
      const detail = e.detail || {};
      if (detail.processed > 0) {
        setFeedback({ type: 'success', message: `⚡ Auto-reconciled ${detail.processed} payment(s)!` });
        loadData(); // Refresh the list
      }
    };

    window.addEventListener('mpesaAutoProcessStart', handleStart);
    window.addEventListener('mpesaAutoProcessEnd', handleEnd);

    return () => {
      window.removeEventListener('mpesaAutoProcessStart', handleStart);
      window.removeEventListener('mpesaAutoProcessEnd', handleEnd);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cbData, studentData] = await Promise.all([
        getOrphanedMpesaCallbacks(),
        getStudents()
      ]);
      setCallbacks(cbData);
      setStudents(studentData);
    } catch (err) {
      console.error("Failed to load reconciliation data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = searchTerm.length > 1 
    ? students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.admNo || s.adm_no || '').toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  const handleLink = async (studentId) => {
    if (!selectedCallback) return;
    setProcessing(true);
    try {
      await reconcileMpesaPayment(selectedCallback.id, studentId);
      setFeedback({ type: 'success', message: 'Payment successfully linked and processed!' });
      setSelectedCallback(null);
      setSearchTerm('');
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleRunAutoProcess = async () => {
    setAutoProcessing(true);
    try {
      const result = await autoProcessMpesaCallbacks();
      if (result.processed > 0) {
        setFeedback({ type: 'success', message: `⚡ Auto-reconciled ${result.processed} payment(s). ${result.orphaned} need manual review.` });
      } else if (result.orphaned > 0) {
        setFeedback({ type: 'error', message: `No auto-matches found. ${result.orphaned} payment(s) need manual review.` });
      } else {
        setFeedback({ type: 'success', message: 'No pending payments to process.' });
      }
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setAutoProcessing(false);
    }
  };

  const handleSimulate = async () => {
    if (!simForm.amount || !simForm.admNo) {
      setFeedback({ type: 'error', message: 'Amount and Admission Number are required.' });
      return;
    }
    setSimulating(true);
    try {
      const result = await simulateMpesaCallback({
        amount: simForm.amount,
        phone: simForm.phone || '254712345678',
        admNo: simForm.admNo
      });
      if (result.processed > 0) {
        setFeedback({ type: 'success', message: `✅ Simulated payment KES ${Number(simForm.amount).toLocaleString()} auto-matched to student ${simForm.admNo}! Receipt: ${result.receipt}` });
      } else {
        setFeedback({ type: 'error', message: `⚠️ Payment simulated (${result.receipt}) but no matching student found for "${simForm.admNo}". Marked as orphaned for manual review.` });
      }
      setSimForm({ amount: '', phone: '', admNo: '' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return <Loader />;

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="page-container glass-morph">
      <div className="page-header">
        <div className="header-info">
          <div className="header-icon-wrap" style={{ background: 'var(--primary-light)' }}>
            <PaymentsIcon size={24} color="var(--primary)" />
          </div>
          <div>
            <h1 className="header-title">M-Pesa Reconciliation</h1>
            <p className="header-subtitle">Payments are auto-matched by Admission Number. Orphans need manual linking.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {autoProcessing && (
            <div className="auto-status-badge processing">
              <div className="pulse-dot" />
              Auto-Processing...
            </div>
          )}
          <button className="auto-process-btn" onClick={handleRunAutoProcess} disabled={autoProcessing}>
            <PlatformZapIcon size={16} /> {autoProcessing ? 'Processing...' : 'Run Auto-Match'}
          </button>
          {isAdmin && (
            <button className="sim-toggle-btn" onClick={() => setShowSimulator(!showSimulator)}>
              {showSimulator ? 'Hide Simulator' : '🧪 Simulate Payment'}
            </button>
          )}
        </div>
      </div>

      {/* Simulation Panel */}
      {showSimulator && isAdmin && (
        <div className="sim-panel slide-up">
          <div className="sim-header">
            <h4>🧪 M-Pesa Payment Simulator</h4>
            <span className="sim-badge">Testing Mode</span>
          </div>
          <p className="sim-desc">Simulate a Daraja API callback. If the Admission Number matches a student, it will be auto-reconciled instantly.</p>
          <div className="sim-form">
            <div className="sim-field">
              <label>Amount (KES)</label>
              <input 
                type="number" 
                placeholder="e.g. 15000" 
                value={simForm.amount}
                onChange={e => setSimForm({...simForm, amount: e.target.value})}
                className="glass-input"
              />
            </div>
            <div className="sim-field">
              <label>Parent Phone</label>
              <input
                type="text"
                placeholder="254712345678"
                value={simForm.phone}
                onChange={e => setSimForm({...simForm, phone: e.target.value})}
                className="glass-input"
              />
            </div>
            <div className="sim-field">
              <label>Account No (Admission No)</label>
              <input
                type="text"
                placeholder="e.g. ADM-001"
                value={simForm.admNo}
                onChange={e => setSimForm({...simForm, admNo: e.target.value})}
                className="glass-input"
              />
            </div>
            <button className="sim-submit-btn" onClick={handleSimulate} disabled={simulating}>
              {simulating ? 'Sending...' : '⚡ Send Simulated Payment'}
            </button>
          </div>
        </div>
      )}

      <div className="reconciliation-layout">
        <div className="callback-list-panel">
          <div className="panel-header">
            <h3>Orphaned Payments ({callbacks.length})</h3>
          </div>
          <div className="callback-scroll">
            {callbacks.length === 0 ? (
              <div className="empty-state">
                <CheckIcon size={48} color="var(--success)" />
                <p>All payments are reconciled!</p>
              </div>
            ) : (
              callbacks.map(cb => (
                <div 
                  key={cb.id} 
                  className={`callback-card ${selectedCallback?.id === cb.id ? 'active' : ''}`}
                  onClick={() => setSelectedCallback(cb)}
                >
                  <div className="cb-main">
                    <span className="cb-receipt">{cb.mpesa_receipt_number}</span>
                    <span className="cb-amount">Kes {Number(cb.amount).toLocaleString()}</span>
                  </div>
                  <div className="cb-meta">
                    <span className="cb-phone">{cb.phone_number}</span>
                    <span className="cb-date">{new Date(cb.transaction_date).toLocaleDateString()}</span>
                  </div>
                  <div className="cb-ref">Ref: {cb.bill_ref_number}</div>
                  <div className="status-indicator">
                    <div className="status-dot" style={{ background: PAYMENT_STATUS_COLORS[cb.status] }} />
                    <span className="status-label">{cb.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="action-panel">
          {selectedCallback ? (
            <div className="reconcile-form card-glass">
              <h3>Link Payment</h3>
              <div className="selected-cb-summary">
                <div className="summary-row">
                  <span>Receipt:</span>
                  <strong>{selectedCallback.mpesa_receipt_number}</strong>
                </div>
                <div className="summary-row">
                  <span>Amount:</span>
                  <strong>Kes {Number(selectedCallback.amount).toLocaleString()}</strong>
                </div>
                <div className="summary-row">
                  <span>Provided Ref:</span>
                  <span className="highlight-ref">{selectedCallback.bill_ref_number}</span>
                </div>
              </div>

              <div className="student-search-section">
                <label>Find Student to Link</label>
                <div className="search-box-wrap">
                  <SearchIcon size={18} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search by Name or Admission No..." 
                    className="glass-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="search-results">
                  {filteredStudents.map(s => (
                    <div key={s.id} className="student-result-item" onClick={() => handleLink(s.id)}>
                      <div className="s-info">
                        <UserIcon size={16} />
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>{s.admNo || s.adm_no}</div>
                          <div className="s-name">{s.name}</div>
                          <div className="s-meta">{s.class}</div>
                        </div>
                      </div>
                      <button className="link-btn" disabled={processing}>
                        {processing ? '...' : 'Link'}
                      </button>
                    </div>
                  ))}
                  {searchTerm.length > 1 && filteredStudents.length === 0 && (
                    <div className="no-results">No students found matching "{searchTerm}"</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="selection-prompt card-glass">
              <AlertIcon size={48} color="var(--primary-light)" />
              <p>Select a payment from the left to begin reconciliation</p>
            </div>
          )}

          {feedback && (
            <div className={`feedback-toast ${feedback.type}`}>
              {feedback.message}
              <button onClick={() => setFeedback(null)}>×</button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .reconciliation-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 24px;
          margin-top: 24px;
          height: calc(100vh - 350px);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }
        .auto-process-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #6B4EFF 0%, #9B7DFF 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .auto-process-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(107,78,255,0.3); }
        .auto-process-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .sim-toggle-btn {
          padding: 10px 20px;
          background: rgba(245, 158, 11, 0.15);
          color: #F59E0B;
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sim-toggle-btn:hover { background: rgba(245, 158, 11, 0.25); }
        .auto-status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .auto-status-badge.processing {
          background: rgba(107, 78, 255, 0.15);
          color: #9B7DFF;
          border: 1px solid rgba(107, 78, 255, 0.3);
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6B4EFF;
          animation: pulse 1.2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        /* Simulator Panel */
        .sim-panel {
          margin-top: 20px;
          padding: 24px;
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 16px;
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sim-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .sim-header h4 { margin: 0; font-size: 1rem; }
        .sim-badge {
          padding: 3px 10px;
          background: rgba(245, 158, 11, 0.2);
          color: #F59E0B;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sim-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .sim-form {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 12px;
          align-items: end;
        }
        .sim-field label {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .sim-submit-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .sim-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(245,158,11,0.3); }
        .sim-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .callback-list-panel {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          overflow: hidden;
        }
        .panel-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
        }
        .callback-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        .callback-card {
          padding: 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .callback-card:hover {
          background: rgba(255,255,255,0.05);
          transform: translateY(-2px);
        }
        .callback-card.active {
          border-color: var(--primary);
          background: rgba(var(--primary-rgb), 0.1);
        }
        .cb-main {
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .cb-receipt { color: var(--text-bright); }
        .cb-amount { color: var(--primary); }
        .cb-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .cb-ref {
          font-size: 0.75rem;
          padding: 4px 8px;
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
          color: #9CA3AF;
          margin-bottom: 8px;
        }
        .highlight-ref {
          color: #F59E0B;
          font-family: monospace;
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .action-panel {
          position: relative;
        }
        .selection-prompt {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 16px;
          color: var(--text-muted);
        }
        .reconcile-form {
          padding: 24px;
          border-radius: 16px;
        }
        .selected-cb-summary {
          margin: 20px 0;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }
        .student-search-section {
          margin-top: 24px;
        }
        .student-search-section label {
          display: block;
          margin-bottom: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .search-box-wrap {
          position: relative;
          margin-bottom: 12px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .glass-input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
        }
        .sim-field .glass-input {
          padding: 12px;
        }
        .student-result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .student-result-item:hover {
          background: rgba(255,255,255,0.055);
        }
        .s-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .s-name { font-weight: 600; }
        .s-meta { font-size: 0.8rem; color: var(--text-muted); }
        .link-btn {
          padding: 6px 16px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }
        .link-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .feedback-toast {
          position: absolute;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideIn 0.3s ease-out;
          max-width: 420px;
          font-size: 0.88rem;
        }
        .feedback-toast.success { background: #065F46; color: #D1FAE5; }
        .feedback-toast.error { background: #991B1B; color: #FEE2E2; }
        @keyframes slideIn {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .reconciliation-layout { grid-template-columns: 1fr; height: auto; }
          .sim-form { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
