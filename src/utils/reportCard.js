import { getPrintHeader } from '../data/coreStore';;

/**
 * CBC Competency Scale Helper
 * 4 = EE (Exceeding Expectations) [80-100%]
 * 3 = ME (Meeting Expectations)   [60-79%]
 * 2 = AE (Approaching Expectations) [40-59%]
 * 1 = BE (Below Expectations)     [0-39%]
 */
export function getCBCCompetency(score) {
  const num = Number(score) || 0;
  if (num >= 80) return { code: 'EE', name: 'Exceeding Expectations', rating: 4, color: '#10b981', badgeBg: '#dcfce7', textHex: '#15803d' };
  if (num >= 60) return { code: 'ME', name: 'Meeting Expectations', rating: 3, color: '#3b82f6', badgeBg: '#dbeafe', textHex: '#1e40af' };
  if (num >= 40) return { code: 'AE', name: 'Approaching Expectations', rating: 2, color: '#f59e0b', badgeBg: '#fef3c7', textHex: '#92400e' };
  return { code: 'BE', name: 'Below Expectations', rating: 1, color: '#ef4444', badgeBg: '#fee2e2', textHex: '#991b1b' };
}

export function getGrade(s) {
  const num = Number(s) || 0;
  if (num >= 80) return 'A';
  if (num >= 70) return 'B';
  if (num >= 60) return 'C';
  if (num >= 50) return 'D';
  return 'E';
}

export function getRemarks(s) {
  const num = Number(s) || 0;
  if (num >= 80) return 'Exceeding Expectations';
  if (num >= 70) return 'Meeting Expectations';
  if (num >= 60) return 'Good Progress';
  if (num >= 50) return 'Approaching Expectations';
  return 'Requires Learning Support';
}

/**
 * Generate and print a student report card (HTML window print + CBC Support)
 */
export async function generateReportCard(student, marks = {}, summary = {}, profile = {}, options = {}) {
  const { isDraft = false } = options;
  const header = await getPrintHeader(`Report Card — ${profile.term || 'Term 1'} ${profile.year || '2024'}`);
  const w = window.open('', '_blank');
  
  const subjects = Object.keys(marks);
  const total = subjects.reduce((acc, s) => acc + (Number(marks[s]) || 0), 0);
  const average = subjects.length > 0 ? (total / subjects.length).toFixed(1) : 0;
  const cbcOverall = getCBCCompetency(average);

  const draftWatermarkCSS = isDraft ? `
    .draft-watermark {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 8rem; font-weight: 900;
      color: rgba(239, 68, 68, 0.08); letter-spacing: 0.2em;
      text-transform: uppercase; pointer-events: none; z-index: 0;
    }
  ` : '';

  const draftBanner = isDraft ? `
    <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 10px 16px; margin-bottom: 24px; text-align: center;">
      <strong style="color: #991b1b; font-size: 0.9rem; text-transform: uppercase;">⚠ DRAFT — Not Yet Released</strong>
      <p style="color: #991b1b; font-size: 0.75rem; margin: 4px 0 0;">This report card has not been officially released. Results may change.</p>
    </div>
  ` : '';

  w.document.write(`<html><head><title>Report Card - ${student.name}</title>
    <style>
      body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; position: relative; }
      .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
      .info-item { display: flex; justify-content: space-between; font-size: 0.9rem; }
      .info-label { font-weight: 700; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
      th, td { padding: 12px 16px; border: 1px solid #e2e8f0; text-align: left; }
      th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; color: #475569; }
      .score { font-weight: 800; color: #4f46e5; }
      .cbc-badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; }
      .summary-box { background: #f1f5f9; padding: 20px; border-radius: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
      .sum-item { text-align: center; }
      .sum-val { font-size: 1.4rem; font-weight: 900; display: block; }
      .sum-lab { font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 800; }
      .comments { margin-top: 24px; }
      .comment-box { border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 12px; }
      .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; margin-top: 50px; text-align: center; }
      .sig-line { border-top: 1px solid #1e293b; padding-top: 8px; font-weight: 700; font-size: 0.85rem; }
      ${draftWatermarkCSS}
    </style>
  </head><body>
    ${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
    ${header}
    ${draftBanner}
    <div class="student-info">
      <div class="info-item"><span class="info-label">Student Name:</span><strong>${student.name}</strong></div>
      <div class="info-item"><span class="info-label">Admission No:</span><strong>${student.admNo || student.adm_no}</strong></div>
      <div class="info-item"><span class="info-label">Class:</span><strong>${student.class || ''} ${student.stream || ''}</strong></div>
      <div class="info-item"><span class="info-label">Gender:</span><strong>${student.gender || '—'}</strong></div>
    </div>

    <!-- CBC Competency Legend -->
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 0.75rem; display: flex; justify-content: space-around;">
      <span><strong style="color: #15803d;">EE (4):</strong> Exceeding (80-100%)</span>
      <span><strong style="color: #1e40af;">ME (3):</strong> Meeting (60-79%)</span>
      <span><strong style="color: #92400e;">AE (2):</strong> Approaching (40-59%)</span>
      <span><strong style="color: #991b1b;">BE (1):</strong> Below (<40%)</span>
    </div>

    <table>
      <thead>
        <tr><th>Learning Area / Subject</th><th>Score (%)</th><th>CBC Competency</th><th>8-4-4 Grade</th><th>Remarks</th></tr>
      </thead>
      <tbody>
        ${subjects.map(s => {
          const val = marks[s];
          const cbc = getCBCCompetency(val);
          return `
          <tr>
            <td><strong>${s}</strong></td>
            <td class="score">${val}%</td>
            <td><span class="cbc-badge" style="background:${cbc.badgeBg}; color:${cbc.textHex}">${cbc.code} — ${cbc.name}</span></td>
            <td><strong>${getGrade(val)}</strong></td>
            <td>${getRemarks(val)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <div class="summary-box">
      <div class="sum-item"><span class="sum-val">${total}</span><span class="sum-lab">Total Marks</span></div>
      <div class="sum-item"><span class="sum-val">${average}%</span><span class="sum-lab">Average Score</span></div>
      <div class="sum-item"><span class="sum-val">${getGrade(average)}</span><span class="sum-lab">Mean Grade</span></div>
      <div class="sum-item"><span class="sum-val" style="color:${cbcOverall.textHex}">${cbcOverall.code}</span><span class="sum-lab">CBC Competency</span></div>
    </div>

    <div class="comments">
      <div class="comment-box"><span class="info-label">Class Teacher's Remarks:</span> <p>${summary.teacherComments || 'A consistent effort. Keep working hard.'}</p></div>
      <div class="comment-box"><span class="info-label">Head Teacher's Remarks:</span> <p>${summary.headComments || 'Good overall progress. Aim higher next term.'}</p></div>
    </div>

    <div class="sig-row">
      <div class="sig-line">Class Teacher Signature</div>
      <div class="sig-line">Head Teacher Signature & Stamp</div>
    </div>
  </body></html>`);

  w.document.close();
  w.print();
}

/**
 * Generate report card as a downloadable PDF file via jsPDF
 */
export async function downloadReportCardPDF(student, marks = {}, summary = {}, profile = {}, options = {}) {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF();
  const subjects = Object.keys(marks);
  const total = subjects.reduce((acc, s) => acc + (Number(marks[s]) || 0), 0);
  const average = subjects.length > 0 ? (total / subjects.length).toFixed(1) : 0;
  const cbcOverall = getCBCCompetency(average);

  // Title Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.schoolName || 'Termly Academy', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Report Card — ${profile.term || 'Term 1'} ${profile.year || '2024'}`, 105, 28, { align: 'center' });

  // Student Info Block
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.rect(14, 34, 182, 22);
  doc.text(`Student Name: ${student.name}`, 18, 42);
  doc.text(`Admission No: ${student.admNo || student.adm_no || 'N/A'}`, 120, 42);
  doc.text(`Class: ${student.class || ''} ${student.stream || ''}`, 18, 50);
  doc.text(`Gender: ${student.gender || '—'}`, 120, 50);

  // AutoTable for Subject Scores
  const tableRows = subjects.map(s => {
    const val = marks[s];
    const cbc = getCBCCompetency(val);
    return [s, `${val}%`, `${cbc.code} (${cbc.name})`, getGrade(val), getRemarks(val)];
  });

  if (doc.autoTable) {
    doc.autoTable({
      startY: 62,
      head: [['Subject / Learning Area', 'Score', 'CBC Competency Level', 'Grade', 'Remarks']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });
  }

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 140;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Marks: ${total} | Average: ${average}% | Grade: ${getGrade(average)} | CBC Competency: ${cbcOverall.code}`, 14, finalY);

  doc.setFont(undefined, 'normal');
  doc.text(`Class Teacher Remarks: ${summary.teacherComments || 'Good effort across learning areas.'}`, 14, finalY + 12);
  doc.text(`Head Teacher Remarks: ${summary.headComments || 'Approved.'}`, 14, finalY + 20);

  doc.save(`Report_Card_${student.name.replace(/\s+/g, '_')}.pdf`);
}
