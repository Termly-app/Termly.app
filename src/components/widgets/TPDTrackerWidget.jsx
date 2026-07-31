import React, { useState, useMemo } from 'react';
import { TeacherIcon, CheckIcon, BookIcon, AlertIcon, ClockIcon } from '../CommonIcons';

/**
 * TPDTrackerWidget — Phase 1: Teacher Professional Development License Tracker
 * 
 * Tracks TSC Kenya CPD points toward the 150-point/3-year cycle requirement.
 * 
 * Props:
 * - teachers: Array of teacher objects (admin view)
 * - currentTeacher: Single teacher object (individual view in MobileGrading)
 */

// Generate demo TPD data if teacher has none
function ensureTPD(teacher) {
  if (teacher.tpd && teacher.tpd.cpd_points !== undefined) return teacher.tpd;
  
  // Deterministic mock based on teacher name hash
  const hash = (teacher.name || 'T').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const points = (hash * 7) % 150;
  const monthsLeft = (hash % 24) + 1;
  const cycleEnd = new Date();
  cycleEnd.setMonth(cycleEnd.getMonth() + monthsLeft);
  const cycleStart = new Date(cycleEnd);
  cycleStart.setFullYear(cycleStart.getFullYear() - 3);
  const licenseExpiry = new Date(cycleEnd);
  licenseExpiry.setMonth(licenseExpiry.getMonth() + Math.floor(hash % 6));

  return {
    cpd_points: points,
    cpd_target: 150,
    cycle_start: cycleStart.toISOString().split('T')[0],
    cycle_end: cycleEnd.toISOString().split('T')[0],
    license_expiry: licenseExpiry.toISOString().split('T')[0],
    activities: [
      { name: 'CBC Training Module 3', date: '2026-06-15', points: 15, certificate: null },
      { name: 'ICT Integration Workshop', date: '2026-03-22', points: 10, certificate: null },
      { name: 'Child Protection Seminar', date: '2024-11-08', points: 8, certificate: null },
    ].slice(0, 1 + (hash % 3)),
  };
}

// SVG Circular Progress Ring
function ProgressRing({ progress, size = 120, strokeWidth = 10, color = '#10B981' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
      />
    </svg>
  );
}

// License urgency color
function getLicenseUrgency(expiryDate) {
  if (!expiryDate) return { color: '#6B7280', label: 'Unknown', bg: '#F3F4F6' };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const monthsLeft = (expiry - now) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsLeft <= 0) return { color: '#DC2626', label: 'Expired', bg: '#FEF2F2' };
  if (monthsLeft < 3) return { color: '#DC2626', label: `${Math.ceil(monthsLeft)}mo left`, bg: '#FEF2F2' };
  if (monthsLeft < 6) return { color: '#D97706', label: `${Math.ceil(monthsLeft)}mo left`, bg: '#FFFBEB' };
  return { color: '#059669', label: `${Math.ceil(monthsLeft)}mo left`, bg: '#ECFDF5' };
}

// ============================
// INDIVIDUAL TEACHER VIEW
// ============================
function TeacherTPDView({ teacher }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '', points: '' });
  const tpd = ensureTPD(teacher);
  const progress = Math.round((tpd.cpd_points / tpd.cpd_target) * 100);
  const urgency = getLicenseUrgency(tpd.license_expiry);

  const ringColor = progress >= 75 ? '#10B981' : progress >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{
      background: '#ffffff', borderRadius: 24, overflow: 'hidden',
      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)',
      border: '1px solid rgba(255,255,255,0.4)',
    }}>
      {/* Gradient Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
        padding: '20px 24px', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TeacherIcon size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>TPD License Tracker</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>TSC CPD Points Progress</div>
        </div>
      </div>

      {/* Progress Ring & Stats */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <ProgressRing progress={progress} size={130} strokeWidth={12} color={ringColor} />
          <div style={{
            position: 'absolute', textAlign: 'center',
            transform: 'rotate(0deg)', // counter the parent SVG rotation
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: ringColor }}>{tpd.cpd_points}</div>
            <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600 }}>of {tpd.cpd_target} pts</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              License Expiry
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                background: urgency.bg, color: urgency.color,
                padding: '4px 10px', borderRadius: 8,
                fontSize: '0.78rem', fontWeight: 700,
              }}>
                {urgency.label}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#374151' }}>
                {tpd.license_expiry ? new Date(tpd.license_expiry).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Cycle Period
            </div>
            <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: 4 }}>
              {tpd.cycle_start ? new Date(tpd.cycle_start).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '—'} →{' '}
              {tpd.cycle_end ? new Date(tpd.cycle_end).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* CPD Activities */}
      <div style={{ padding: '0 24px 8px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookIcon size={14} /> Recent CPD Activities
        </div>
        {(tpd.activities || []).map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: '#FAFAFA', borderRadius: 12,
            marginBottom: 8, border: '1px solid #F3F4F6',
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2937' }}>{a.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                {new Date(a.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <span style={{
              background: '#ECFDF5', color: '#059669',
              padding: '4px 10px', borderRadius: 8,
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              +{a.points} pts
            </span>
          </div>
        ))}
      </div>

      {/* Log Activity Button */}
      <div style={{ padding: '12px 24px 20px' }}>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem', letterSpacing: 0.3,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 25px rgba(139,92,246,0.3)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
          >
            + Log CPD Activity
          </button>
        ) : (
          <div style={{ background: '#F9FAFB', borderRadius: 16, padding: 18, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: '#374151' }}>Log CPD Activity</div>
            <input
              type="text" placeholder="Activity name"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #D1D5DB', marginBottom: 10, fontSize: '0.85rem', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input
                type="date" value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
              />
              <input
                type="number" placeholder="Points" min="1" max="50"
                value={formData.points} onChange={e => setFormData({ ...formData, points: e.target.value })}
                style={{ width: 90, padding: '10px 14px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{
                flex: 1, padding: '10px', background: '#F3F4F6', color: '#6B7280',
                border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
              }}>Cancel</button>
              <button
                onClick={() => {
                  console.log('[TPD] Logged activity:', formData);
                  setShowForm(false);
                  setFormData({ name: '', date: '', points: '' });
                }}
                style={{
                  flex: 1, padding: '10px', background: '#8B5CF6', color: '#fff',
                  border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                }}
              >Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================
// ADMIN OVERVIEW
// ============================
function AdminTPDOverview({ teachers = [] }) {
  const analysis = useMemo(() => {
    const enriched = teachers.map(t => {
      const tpd = ensureTPD(t);
      const progress = Math.round((tpd.cpd_points / tpd.cpd_target) * 100);
      const urgency = getLicenseUrgency(tpd.license_expiry);
      return { ...t, tpd, progress, urgency };
    });

    const compliant = enriched.filter(t => t.progress >= 100).length;
    const expiringSoon = enriched.filter(t => t.urgency.color === '#DC2626').length;
    const avgProgress = enriched.length > 0
      ? Math.round(enriched.reduce((a, t) => a + t.progress, 0) / enriched.length)
      : 0;

    return { enriched, compliant, expiringSoon, avgProgress, total: enriched.length };
  }, [teachers]);

  return (
    <div style={{
      background: '#ffffff', borderRadius: 24, overflow: 'hidden',
      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)',
      border: '1px solid rgba(255,255,255,0.4)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
        padding: '18px 24px', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TeacherIcon size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>TPD Compliance Overview</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>TSC License & CPD Tracking</div>
          </div>
        </div>
        <span style={{
          background: 'rgba(255,255,255,0.2)', padding: '5px 12px',
          borderRadius: 10, fontSize: '0.75rem', fontWeight: 700,
        }}>
          {analysis.compliant}/{analysis.total} Compliant
        </span>
      </div>

      {/* Summary Bar */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Avg Progress', value: `${analysis.avgProgress}%`, color: '#8B5CF6', bg: '#F5F3FF' },
          { label: 'Compliant', value: analysis.compliant, color: '#10B981', bg: '#ECFDF5' },
          { label: 'License Expiring', value: analysis.expiringSoon, color: '#EF4444', bg: '#FEF2F2' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 90, background: s.bg, borderRadius: 14,
            padding: '12px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: s.color, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Teacher Progress Bars */}
      <div style={{ padding: '0 24px 20px', maxHeight: 280, overflowY: 'auto' }}>
        {analysis.enriched.map((t, i) => {
          const barColor = t.progress >= 100 ? '#10B981' : t.progress >= 50 ? '#F59E0B' : '#EF4444';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: i < analysis.enriched.length - 1 ? '1px solid #F3F4F6' : 'none',
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#6B7280' }}>
                {(t.name || 'T').charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                    {t.name}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor }}>{t.tpd.cpd_points}/{t.tpd.cpd_target}</span>
                    {t.urgency.color === '#DC2626' && (
                      <span style={{
                        background: '#FEF2F2', color: '#DC2626', padding: '2px 6px',
                        borderRadius: 6, fontSize: '0.62rem', fontWeight: 700,
                      }}>
                        ⚠ {t.urgency.label}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: barColor,
                    width: `${Math.min(t.progress, 100)}%`,
                    transition: 'width 0.8s ease-in-out',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================
// MAIN EXPORT
// ============================
export default function TPDTrackerWidget({ teachers, currentTeacher }) {
  if (currentTeacher) {
    return <TeacherTPDView teacher={currentTeacher} />;
  }
  return <AdminTPDOverview teachers={teachers || []} />;
}
