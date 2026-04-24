import React from 'react';
import { getPrintHeader } from '../../data/store';

/**
 * Generate and print a student report card.
 * @param {Object} student - Student object with name, admNo, class, stream, gender
 * @param {Object} marks   - { subject: score, ... }
 * @param {Object} summary - { teacherComments, headComments }
 * @param {Object} profile - { term, year, schoolName }
 * @param {Object} options - { isDraft: boolean } - show DRAFT watermark when true
 */
export async function generateReportCard(student, marks, summary, profile, options = {}) {
  const { isDraft = false } = options;
  const header = await getPrintHeader(`Report Card — ${profile.term || 'Term 1'} ${profile.year || '2024'}`);
  const w = window.open('', '_blank');
  
  const subjects = Object.keys(marks);
  const total = subjects.reduce((acc, s) => acc + (Number(marks[s]) || 0), 0);
  const average = subjects.length > 0 ? (total / subjects.length).toFixed(1) : 0;

  const draftWatermarkCSS = isDraft ? `
    .draft-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 8rem;
      font-weight: 900;
      color: rgba(239, 68, 68, 0.08);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      pointer-events: none;
      z-index: 0;
      white-space: nowrap;
      user-select: none;
    }
    @media print {
      .draft-watermark {
        color: rgba(239, 68, 68, 0.06) !important;
      }
    }
  ` : '';

  const draftBanner = isDraft ? `
    <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 10px 16px; margin-bottom: 24px; text-align: center;">
      <strong style="color: #991b1b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em;">⚠ DRAFT — Not Yet Released</strong>
      <p style="color: #991b1b; font-size: 0.75rem; margin: 4px 0 0;">This report card has not been officially released. Results may change.</p>
    </div>
  ` : '';

  const draftWatermarkHTML = isDraft ? '<div class="draft-watermark">DRAFT</div>' : '';

  w.document.write(`<html><head><title>Report Card - ${student.name}</title>
    <style>
      body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; position: relative; }
      .card-header { text-align: center; margin-bottom: 32px; }
      .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 12px; }
      .info-item { display: flex; justify-content: space-between; font-size: 0.9rem; }
      .info-label { font-weight: 700; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 32px; position: relative; z-index: 1; }
      th, td { padding: 12px 16px; border: 1px solid #e2e8f0; text-align: left; }
      th { background: #f8fafc; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
      .score { font-weight: 800; color: #4f46e5; }
      .summary-box { background: #f1f5f9; padding: 24px; border-radius: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; position: relative; z-index: 1; }
      .sum-item { text-align: center; }
      .sum-val { font-size: 1.5rem; font-weight: 900; display: block; }
      .sum-lab { font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 800; }
      .comments { margin-top: 32px; position: relative; z-index: 1; }
      .comment-box { border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 16px; }
      .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; margin-top: 60px; text-align: center; position: relative; z-index: 1; }
      .sig-line { border-top: 1px solid #1e293b; padding-top: 8px; font-weight: 700; font-size: 0.85rem; }
      ${draftWatermarkCSS}
    </style>
  </head><body>
    ${draftWatermarkHTML}
    ${header}
    ${draftBanner}
    <div class="student-info">
      <div class="info-item"><span class="info-label">Student Name:</span><strong>${student.name}</strong></div>
      <div class="info-item"><span class="info-label">Admission No:</span><strong>${student.admNo}</strong></div>
      <div class="info-item"><span class="info-label">Class:</span><strong>${student.class} ${student.stream || ''}</strong></div>
      <div class="info-item"><span class="info-label">Gender:</span><strong>${student.gender || '—'}</strong></div>
    </div>

    <table>
      <thead>
        <tr><th>Subject</th><th>Score (%)</th><th>Grade</th><th>Remarks</th></tr>
      </thead>
      <tbody>
        ${subjects.map(s => `
          <tr>
            <td><strong>${s}</strong></td>
            <td class="score">${marks[s]}%</td>
            <td>${getGrade(marks[s])}</td>
            <td>${getRemarks(marks[s])}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-box">
      <div class="sum-item"><span class="sum-val">${total}</span><span class="sum-lab">Total Marks</span></div>
      <div class="sum-item"><span class="sum-val">${average}%</span><span class="sum-lab">Average Score</span></div>
      <div class="sum-item"><span class="sum-val">${getGrade(average)}</span><span class="sum-lab">Mean Grade</span></div>
    </div>

    <div class="comments">
      <div class="comment-box"><span class="info-label">Class Teacher's Remarks:</span> <p>${summary.teacherComments || 'A consistent effort. Keep it up.'}</p></div>
      <div class="comment-box"><span class="info-label">Head Teacher's Remarks:</span> <p>${summary.headComments || 'Satisfactory performance. Aim higher next term.'}</p></div>
    </div>

    <div class="sig-row">
      <div class="sig-line">Class Teacher Signature</div>
      <div class="sig-line">Head Teacher Signature & Stamp</div>
    </div>
  </body></html>`);

  function getGrade(s) {
    if(s >= 80) return 'A';
    if(s >= 70) return 'B';
    if(s >= 60) return 'C';
    if(s >= 50) return 'D';
    return 'E';
  }
  function getRemarks(s) {
    if(s >= 80) return 'Excellent';
    if(s >= 70) return 'Very Good';
    if(s >= 60) return 'Good';
    if(s >= 50) return 'Fair';
    return 'Below Average';
  }

  w.document.close();
  w.print();
}
