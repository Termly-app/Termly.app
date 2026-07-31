/**
 * NEMISExportModal — SuperAdmin-level NEMIS export trigger
 *
 * Appears in the Schools tab. Lets the platform owner export
 * student data for any school in NEMIS-compatible CSV format.
 *
 * Requires these Supabase queries (see storeAdditions.js):
 *   getStudentsBySchool(schoolId) → students[]
 */

import { useState } from 'react';
import { exportNEMIS, downloadCSV, validateNEMISData, nemisFilename, ALL_GRADES } from '../../../utils/nemisExport';
import { FlagIcon, CheckIcon, AlertIcon, CrossIcon } from '../../../components/CommonIcons';


export default function NEMISExportModal({ school, onClose, getStudentsBySchool }) {
  const S = {
    overlay : { position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
    box     : { background:'#161A17', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', position:'relative' },
    close   : { position:'absolute', top:14, right:14, background:'#0C0E0D', border:'1px solid rgba(255,255,255,.08)', borderRadius:6, width:28, height:28, color:'#5A6B5C', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' },
    label   : { fontSize:'.58rem', color:'#5A6B5C', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 },
    input   : { width:'100%', background:'#0C0E0D', border:'1px solid rgba(255,255,255,.1)', borderRadius:7, padding:'8px 11px', color:'#D4DDD6', fontFamily:"'Inter',sans-serif", fontSize:'.78rem', outline:'none' },
    pill    : (active) => ({ padding:'4px 10px', borderRadius:5, border:`1px solid ${active ? '#10B981' : 'rgba(255,255,255,.08)'}`, background: active ? 'rgba(16,185,129,.15)' : 'transparent', color: active ? '#10B981' : '#5A6B5C', fontSize:'.68rem', cursor:'pointer', transition:'all .15s' }),
    btn     : (color='#10B981') => ({ padding:'10px 0', borderRadius:8, background:`linear-gradient(135deg,${color},${color}cc)`, color:'#fff', border:'none', fontFamily:"'Inter',sans-serif", fontSize:'.82rem', fontWeight:700, cursor:'pointer', width:'100%', marginTop:6 }),
    btnOut  : { padding:'10px 0', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,.1)', color:'#5A6B5C', fontFamily:"'Inter',sans-serif", fontSize:'.82rem', cursor:'pointer', width:'100%', marginTop:6 },
  };
  const [step,     setStep]     = useState('config');  // config | validating | done | error
  const [term,     setTerm]     = useState('');
  const [grades,   setGrades]   = useState([]);        // empty = all grades
  const [issues,   setIssues]   = useState([]);
  const [count,    setCount]    = useState(0);
  const [loading,  setLoading]  = useState(false);

  if (!school) return null;

  const toggleGrade = (g) =>
    setGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const allStudents = await getStudentsBySchool(school.id);
      const filtered    = grades.length ? allStudents.filter(s => grades.includes(s.grade || s.class)) : allStudents;

      const found = validateNEMISData(filtered);
      setIssues(found);
      setCount(filtered.length);

      if (found.length > 0) {
        setStep('validating');
        setLoading(false);
        return;
      }

      const csv = exportNEMIS(filtered);
      downloadCSV(csv, nemisFilename(school.name, term));
      setStep('done');
    } catch (err) {
      console.error('NEMIS export error:', err);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleForceExport = async () => {
    setLoading(true);
    try {
      const allStudents = await getStudentsBySchool(school.id);
      const filtered    = grades.length ? allStudents.filter(s => grades.includes(s.grade || s.class)) : allStudents;
      const csv = exportNEMIS(filtered, { includeIncomplete: true });
      downloadCSV(csv, nemisFilename(school.name, term));
      setStep('done');
    } catch (err) {
      setStep('error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.box}>
        <button style={S.close} onClick={onClose}><CrossIcon size={18} /></button>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
          <div style={{ width:40, height:40, borderRadius:9, background:'rgba(74,158,232,.15)', border:'1px solid rgba(74,158,232,.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#4A9EE8', flexShrink:0 }}><FlagIcon size={24} /></div>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'.92rem', fontWeight:700, color:'#fff' }}>NEMIS Export</div>
            <div style={{ fontSize:'.68rem', color:'#5A6B5C', marginTop:2 }}>{school.name}</div>
          </div>
        </div>

        {/* ── CONFIG STEP ── */}
        {step === 'config' && (
          <>
            <div style={{ background:'rgba(74,158,232,.05)', border:'1px solid rgba(74,158,232,.15)', borderRadius:9, padding:'11px 14px', marginBottom:20 }}>
              <div style={{ fontSize:'.72rem', color:'#4A9EE8', lineHeight:1.5 }}>
                Generates a CSV file compatible with the Kenya NEMIS portal. Include all required student fields (UPI, DOB, gender, class) to avoid upload errors.
              </div>
            </div>

            {/* Term label */}
            <div style={{ marginBottom:16 }}>
              <div style={S.label}>Term Label (appears in filename)</div>
              <input style={S.input} placeholder="e.g. Term 1 2026" value={term} onChange={e => setTerm(e.target.value)} />
            </div>

            {/* Grade filter */}
            <div style={{ marginBottom:22 }}>
              <div style={S.label}>Filter by Grade <span style={{ color:'#354037' }}>(leave blank = export all)</span></div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {ALL_GRADES.map(g => (
                  <button key={g} style={S.pill(grades.includes(g))} onClick={() => toggleGrade(g)}>{g}</button>
                ))}
              </div>
            </div>

            <button style={S.btn()} onClick={handleExport} disabled={loading}>
              {loading ? 'Preparing export...' : <><CheckIcon size={14} /> Generate NEMIS CSV</>}
            </button>
          </>
        )}

        {/* ── VALIDATION WARNINGS ── */}
        {step === 'validating' && (
          <>
            <div style={{ background:'rgba(232,160,32,.06)', border:'1px solid rgba(232,160,32,.2)', borderRadius:9, padding:'12px 14px', marginBottom:18 }}>
              <div style={{ fontSize:'.78rem', fontWeight:700, color:'#E8A020', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                <AlertIcon size={14} /> {issues.length} data issue{issues.length !== 1 ? 's' : ''} found in {count} students
              </div>
              <div style={{ fontSize:'.7rem', color:'#8A9B6C', lineHeight:1.5 }}>
                The NEMIS portal may reject incomplete records. You can fix the student data first, or export anyway and fix in Excel before uploading.
              </div>
            </div>

            <div style={{ maxHeight:200, overflowY:'auto', background:'#0C0E0D', borderRadius:8, border:'1px solid rgba(255,255,255,.06)', padding:'10px 13px', marginBottom:18 }}>
              {issues.slice(0, 50).map((issue, i) => (
                <div key={i} style={{ fontSize:'.68rem', color:'#8A9B6C', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                  • {issue}
                </div>
              ))}
              {issues.length > 50 && (
                <div style={{ fontSize:'.65rem', color:'#5A6B5C', marginTop:6 }}>...and {issues.length - 50} more</div>
              )}
            </div>

            <button style={S.btn('#E8A020')} onClick={handleForceExport} disabled={loading}>
              {loading ? 'Exporting...' : 'Export Anyway (fix in Excel)'}
            </button>
            <button style={S.btnOut} onClick={() => setStep('config')}>← Go Back &amp; Fix Data</button>
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ marginBottom:12, color:'#0DD88A' }}><CheckIcon size={48} /></div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'.95rem', fontWeight:700, color:'#0DD88A', marginBottom:8 }}>CSV Downloaded</div>
            <div style={{ fontSize:'.75rem', color:'#5A6B5C', lineHeight:1.6, marginBottom:20 }}>
              Open the file in Excel, verify the data, then upload to the NEMIS portal at <span style={{ color:'#4A9EE8' }}>nemis.education.go.ke</span>
            </div>
            <button style={S.btnOut} onClick={onClose}>Close</button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ marginBottom:12, color:'#D4506A' }}><CrossIcon size={40} /></div>
            <div style={{ fontSize:'.82rem', color:'#D4506A', marginBottom:16 }}>Export failed. Could not load student data.</div>
            <button style={S.btnOut} onClick={() => setStep('config')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
