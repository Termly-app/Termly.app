import React, { useState, useMemo } from 'react';
import {
  AlertIcon, ActivityIcon, UserIcon, ChevronRightIcon, BookIcon, CheckIcon
} from '../CommonIcons';

/**
 * EarlyWarningWidget — Phase 1: Early-Warning Analytics
 * 
 * Class-level indicator for attendance dips and academic competency declines.
 * Shows at-risk students combining both signals.
 * 
 * Props:
 * - students: Array of student objects with { id, name, class, stream }
 * - attendance: Object keyed by date -> { [studentId]: { Morning: 'present'|'absent'|'late' } }
 * - marks: Object/Array of exam results with { student_id, mean_score, exam_name, date }
 * - profile: School profile with { activeClasses }
 */
export default function EarlyWarningWidget({ students = [], attendance = {}, marks = {}, profile = {} }) {
  const [expanded, setExpanded] = useState(false);

  // ========================
  // ANALYTICS COMPUTATION
  // ========================

  const analytics = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // 1. Attendance: 7-day rolling rate per class
    const classDates = {};
    const studentAttendance = {};

    // Get dates in last 7 days
    const recentDates = [];
    for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      recentDates.push(d.toISOString().split('T')[0]);
    }

    // Calculate per-student attendance in last 7 days
    students.forEach(s => {
      let present = 0;
      let total = 0;
      recentDates.forEach(date => {
        const dayAtt = attendance[date];
        if (!dayAtt) return;
        const studentAtt = dayAtt[s.id];
        if (!studentAtt) return;
        total++;
        const status = typeof studentAtt === 'object' ? studentAtt.Morning : studentAtt;
        if (status === 'present' || status === 'late') present++;
      });
      studentAttendance[s.id] = { present, total, rate: total > 0 ? (present / total * 100) : 100 };

      // Aggregate by class
      if (!classDates[s.class]) classDates[s.class] = { totalPresent: 0, totalRecords: 0, students: 0 };
      classDates[s.class].totalPresent += present;
      classDates[s.class].totalRecords += total;
      classDates[s.class].students++;
    });

    // Flag classes below 85%
    const attendanceDipClasses = [];
    Object.entries(classDates).forEach(([className, data]) => {
      const rate = data.totalRecords > 0 ? (data.totalPresent / data.totalRecords * 100) : 100;
      if (rate < 85) {
        attendanceDipClasses.push({ className, rate: rate.toFixed(1), students: data.students });
      }
    });

    // 2. Academic: Students whose latest exam dropped >15% from previous
    const academicDeclineStudents = [];
    const examResults = Array.isArray(marks) ? marks : [];

    // Group by student
    const studentExams = {};
    examResults.forEach(m => {
      const sid = m.student_id;
      if (!sid) return;
      if (!studentExams[sid]) studentExams[sid] = [];
      studentExams[sid].push(m);
    });

    // Compare last 2 exams per student
    Object.entries(studentExams).forEach(([sid, exams]) => {
      if (exams.length < 2) return;
      exams.sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
      const latest = Number(exams[0].mean_score || exams[0].total_marks || 0);
      const previous = Number(exams[1].mean_score || exams[1].total_marks || 0);
      if (previous > 0 && latest < previous) {
        const drop = ((previous - latest) / previous) * 100;
        if (drop > 15) {
          const student = students.find(s => s.id === sid);
          if (student) {
            academicDeclineStudents.push({
              ...student,
              latestScore: latest.toFixed(1),
              previousScore: previous.toFixed(1),
              dropPct: drop.toFixed(1),
            });
          }
        }
      }
    });

    // 3. At-Risk: Absent >3 days in last 7 AND grades dropped >15%
    const declineStudentIds = new Set(academicDeclineStudents.map(s => s.id));
    const atRiskStudents = [];
    students.forEach(s => {
      const att = studentAttendance[s.id];
      const absentDays = att ? (att.total - att.present) : 0;
      if (absentDays >= 3 && declineStudentIds.has(s.id)) {
        const decline = academicDeclineStudents.find(d => d.id === s.id);
        atRiskStudents.push({
          ...s,
          absentDays,
          attendanceRate: att?.rate?.toFixed(1) || '0',
          latestScore: decline?.latestScore || '-',
          previousScore: decline?.previousScore || '-',
          dropPct: decline?.dropPct || '0',
        });
      }
    });

    return {
      attendanceDipClasses,
      academicDeclineStudents,
      atRiskStudents,
      allClear: attendanceDipClasses.length === 0 && academicDeclineStudents.length === 0 && atRiskStudents.length === 0,
    };
  }, [students, attendance, marks]);

  // ========================
  // RENDER
  // ========================

  const cardStyle = {
    background: '#ffffff',
    borderRadius: 24,
    padding: 0,
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)',
    border: '1px solid rgba(255,255,255,0.4)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  const headerStyle = {
    background: analytics.allClear
      ? 'linear-gradient(135deg, #10B981, #059669)'
      : 'linear-gradient(135deg, #EF4444, #DC2626)',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#fff',
  };

  const metricCardStyle = (color, bg) => ({
    flex: 1,
    minWidth: 120,
    background: bg,
    borderRadius: 16,
    padding: '16px 18px',
    textAlign: 'center',
    border: `1px solid ${color}15`,
    transition: 'transform 0.2s ease',
  });

  if (analytics.allClear) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>All Clear</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>No attendance or academic warnings detected</div>
            </div>
          </div>
          <span style={{ fontSize: '1.8rem' }}>✅</span>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertIcon size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Early Warning System</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>
              {analytics.atRiskStudents.length} at-risk · {analytics.attendanceDipClasses.length} class dips · {analytics.academicDeclineStudents.length} grade drops
            </div>
          </div>
        </div>
        <span style={{ fontSize: '1.8rem' }}>⚠️</span>
      </div>

      {/* Metric Cards */}
      <div style={{ padding: '20px 24px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {/* At-Risk */}
        <div style={metricCardStyle('#EF4444', '#FEF2F2')}>
          <div style={{
            fontSize: '2rem', fontWeight: 900, color: '#EF4444',
            animation: analytics.atRiskStudents.length > 0 ? 'earlyWarnPulse 2s infinite' : 'none',
          }}>
            {analytics.atRiskStudents.length}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991B1B', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            At-Risk Students
          </div>
        </div>

        {/* Attendance Dips */}
        <div style={metricCardStyle('#F59E0B', '#FFFBEB')}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F59E0B' }}>
            {analytics.attendanceDipClasses.length}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Attendance Dip Classes
          </div>
        </div>

        {/* Academic Decline */}
        <div style={metricCardStyle('#3B82F6', '#EFF6FF')}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#3B82F6' }}>
            {analytics.academicDeclineStudents.length}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E40AF', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Grade Decline
          </div>
        </div>
      </div>

      {/* Attendance Dip Classes List */}
      {analytics.attendanceDipClasses.length > 0 && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Classes Below 85% Attendance (7 days)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {analytics.attendanceDipClasses.map((c, i) => (
              <span key={i} style={{
                background: '#FFFBEB', color: '#92400E', padding: '5px 12px',
                borderRadius: 10, fontSize: '0.75rem', fontWeight: 700,
                border: '1px solid #FDE68A',
              }}>
                {c.className} — {c.rate}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expand/Collapse Drill-Down */}
      {analytics.atRiskStudents.length > 0 && (
        <div style={{ borderTop: '1px solid #F3F4F6' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%', padding: '14px 24px', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: '0.82rem', fontWeight: 700, color: '#EF4444',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserIcon size={16} /> View At-Risk Students ({analytics.atRiskStudents.length})
            </span>
            <ChevronRightIcon size={16} style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }} />
          </button>

          {expanded && (
            <div style={{ padding: '0 24px 20px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                      {['Student', 'Class', 'Attendance', 'Prev Score', 'Latest', 'Drop'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.atRiskStudents.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>{s.class}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            background: '#FEF2F2', color: '#DC2626', padding: '3px 8px',
                            borderRadius: 6, fontWeight: 700, fontSize: '0.72rem',
                          }}>
                            {s.attendanceRate}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>{s.previousScore}%</td>
                        <td style={{ padding: '10px 12px', color: '#DC2626', fontWeight: 700 }}>{s.latestScore}%</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            background: '#FEF2F2', color: '#DC2626', padding: '3px 8px',
                            borderRadius: 6, fontWeight: 700, fontSize: '0.72rem',
                          }}>
                            ↓{s.dropPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes earlyWarnPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
