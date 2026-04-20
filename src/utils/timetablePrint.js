import { getPrintHeader, getPrintFooter } from '../data/store';

const PRINT_CSS = `
  @page { size: landscape; margin: 10mm; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:10pt; background:#fff; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; margin: 0; }
  .wrap { padding:10mm; width: 100%; }
  .school-header-wrap { margin-bottom: 15px; }
  .doc-info { margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
  .doc-title     { font-size:14pt; font-weight:800; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.05em; margin:0; }
  .doc-sub       { font-size:10pt; color:#475569; font-weight:600; }

  table  { width:100%; border-collapse:collapse; margin-top:8px; table-layout: fixed; }
  th     { background:#1e3a5f; color:#fff; padding:6px 4px; font-size:8pt; text-align:center; border:1px solid #000; }
  th.time-th { width: 85px; }
  td     { padding:4px 4px; border:1px solid #000; vertical-align:top; min-height:45px; font-size:8pt; word-wrap: break-word; }
  td.time-cell  { background:#f8fafc; font-weight:bold; font-size:8pt; text-align:center; color:#333; width: 85px; vertical-align:middle; border-right: 2px solid #000; }
  td.break-cell { background:#f1f5f9; text-align:center; color:#64748b; font-style:italic; font-size:8pt; vertical-align:middle; font-weight: 600; }
  
  .cell-subject { font-weight:bold; font-size:9pt; margin-bottom: 2px; }
  .cell-teacher { font-size:7.5pt; color:#334155; font-weight: 600; }
  .cell-class   { font-size:7.5pt; color:#334155; font-weight: 600; }

  .footer { display: flex; justify-content: space-between; font-size:7pt; color:#64748b; margin-top:12px; padding-top:6px; border-top:1px solid #e2e8f0; }
  .print-date { font-style: italic; }
`;

function openPrint(html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PRINT_CSS}</style></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); win.onafterprint = () => win.close(); }, 500);
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/**
 * Print a class timetable
 */
export async function printClassTimetable({ school, classGrade, stream, period, config, slots, activeDays }) {
  const footer = getPrintFooter();


  const days = activeDays || DAYS.slice(0, 5);

  // Build lookup: `${day}__${slotIndex}` → slot
  const lookup = {};
  slots.forEach(s => { lookup[`${s.day_of_week}__${s.slot_index}`] = s; });

  const dayHeaders = days.map(d => `<th>${d}</th>`).join('');

  const rows = config.map(cfg => {
    if (cfg.is_break) {
      return `<tr>
        <td class="time-cell">${cfg.start_time}<br/><span style="font-weight:normal;font-size:7pt">${cfg.label}</span></td>
        ${days.map(() => `<td class="break-cell">${cfg.label}</td>`).join('')}
      </tr>`;
    }
    const cells = days.map(day => {
      const s = lookup[`${day}__${cfg.slot_index}`];
      if (s?.is_double_second) return '';

      if (!s || !s.subject) return '<td></td>';

      const dblClass = s.is_double_first ? ' double-first' : '';
      const rowSpanAttr = s.is_double_first ? ' rowspan="2"' : '';

      return `<td class="${dblClass}"${rowSpanAttr}>
        <div class="cell-subject">${s.subject}</div>
        ${s.teachers?.staff_code ? `<div class="cell-teacher">${s.teachers.staff_code}</div>` : ''}
      </td>`;
    }).join('');

    return `<tr>
      <td class="time-cell">${cfg.start_time}–${cfg.end_time}<br/><span style="font-weight:normal;font-size:7pt;color:#777">${cfg.label}</span></td>
      ${cells}
    </tr>`;
  }).join('');

  const html = `
    <div class="wrap">
      <div class="doc-info">
        <div class="doc-title">${classGrade}${stream ? ` — ${stream}` : ''}</div>
        <div class="doc-sub">${period?.year || ''} - Term ${period?.term || ''}</div>
      </div>


    <table>
      <thead><tr><th class="time-th">Time</th>${dayHeaders}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">
      <div>${footer}</div>
      <div class="print-date">Generated: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>`;

  openPrint(html);
}

/**
 * Print a teacher's personal timetable
 */
export async function printTeacherTimetable({ school, teacher, period, config, slots, activeDays }) {
  const footer = getPrintFooter();


  const days = activeDays || DAYS.slice(0, 5);

  const lookup = {};
  slots.forEach(s => { lookup[`${s.day_of_week}__${s.slot_index}`] = s; });

  const dayHeaders = days.map(d => `<th>${d}</th>`).join('');

  const rows = config.map(cfg => {
    if (cfg.is_break) {
      return `<tr>
        <td class="time-cell">${cfg.start_time}<br/><span style="font-weight:normal;font-size:7pt">${cfg.label}</span></td>
        ${days.map(() => `<td class="break-cell">${cfg.label}</td>`).join('')}
      </tr>`;
    }
    const cells = days.map(day => {
      const s = lookup[`${day}__${cfg.slot_index}`];
      if (s?.is_double_second) return '';

      if (!s || !s.subject) return '<td></td>';

      const dblClass = s.is_double_first ? ' double-first' : '';
      const rowSpanAttr = s.is_double_first ? ' rowspan="2"' : '';

      return `<td class="${dblClass}"${rowSpanAttr}>
        <div class="cell-subject">${s.subject}</div>
        <div class="cell-class">${s.class_grade}${s.stream ? ` ${s.stream}` : ''}</div>
      </td>`;
    }).join('');

    return `<tr>
      <td class="time-cell">${cfg.start_time}–${cfg.end_time}<br/><span style="font-weight:normal;font-size:7pt;color:#777">${cfg.label}</span></td>
      ${cells}
    </tr>`;
  }).join('');

  const html = `
    <div class="wrap">
      <div class="doc-info">
        <div class="doc-title">${teacher?.name || 'Teacher'}</div>
        <div class="doc-sub">${teacher?.staff_code ? `Staff ID: ${teacher.staff_code} · ` : ''} ${period?.year || ''} - Term ${period?.term || ''}</div>
      </div>

      <table>
        <thead><tr><th class="time-th">Time</th>${dayHeaders}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${footer}
    </div>`;

  openPrint(html);
}

/**
 * Print all teachers (one per page)
 */
export async function printAllTeachersTimetables({ school, teachers, period, config, allSlots, activeDays }) {
  const footer = getPrintFooter();
  const sorted = [...teachers].sort((a, b) => (a.staff_code || '').localeCompare(b.staff_code || ''));
  const days = activeDays || DAYS.slice(0, 5);
  const dayHeaders = days.map(d => `<th>${d}</th>`).join('');

  const pages = await Promise.all(sorted.map(async (teacher, idx) => {
    const teacherSlots = allSlots.filter(s => s.teacher_id === teacher.id);

    const lookup = {};
    teacherSlots.forEach(s => { lookup[`${s.day_of_week}__${s.slot_index}`] = s; });

    const rows = config.map(cfg => {
      if (cfg.is_break) {
        return `<tr>
          <td class="time-cell">${cfg.start_time}<br/><span style="font-weight:normal;font-size:7pt">${cfg.label}</span></td>
          ${days.map(() => `<td class="break-cell">${cfg.label}</td>`).join('')}
        </tr>`;
      }
      const cells = days.map(day => {
        const s = lookup[`${day}__${cfg.slot_index}`];
        if (s?.is_double_second) return '';
        if (!s || !s.subject) return '<td></td>';
        
        const rowSpanAttr = s.is_double_first ? ' rowspan="2"' : '';
        return `<td${rowSpanAttr}>
          <div class="cell-subject">${s.subject}</div>
          <div class="cell-class">${s.class_grade}${s.stream ? ` ${s.stream}` : ''}</div>
        </td>`;
      }).join('');

      return `<tr>
        <td class="time-cell">${cfg.start_time}–${cfg.end_time}</td>
        ${cells}
      </tr>`;
    }).join('');

    return `
      <div class="wrap" style="${idx > 0 ? 'page-break-before: always;' : ''}">
        <div class="doc-info">
          <div class="doc-title">${teacher.name}</div>
          <div class="doc-sub">Staff ID: ${teacher.staff_code || '—'} &nbsp;·&nbsp; ${period?.year || ''} - Term ${period?.term || ''}</div>
        </div>

        <table>
          <thead><tr><th class="time-th">Time</th>${dayHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${footer}
      </div>
    `;
  }));

  openPrint(pages.join(''));
}

/**
 * Print Exam Schedule (List View)
 */

