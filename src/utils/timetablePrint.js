import { getPrintHeader, getPrintFooter } from '../data/store';

const PRINT_CSS = `
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:10pt; background:#fff; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .wrap { padding:15mm; }
  .school-header-wrap { margin-bottom: 20px; }
  .doc-info { margin-bottom: 12px; }
  .doc-title     { font-size:16pt; font-weight:800; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.05em; margin:0; }
  .doc-sub       { font-size:11pt; color:#475569; font-weight:600; margin-top:2px; }

  table  { width:100%; border-collapse:collapse; margin-top:10px; }
  th     { background:#1a1a2e; color:#fff; padding:7px 6px; font-size:9pt; text-align:center; border:1px solid #000; }
  th.time-th { text-align:left; padding-left:8px; width:72px; }
  td     { padding:5px 5px; border:1px solid #ccc; vertical-align:top; min-height:36px; font-size:9pt; }
  td.time-cell  { background:#f5f5f5; font-weight:bold; font-size:8pt; text-align:center; color:#333; width:72px; vertical-align:middle; }
  td.break-cell { background:#f0f0f0; text-align:center; color:#888; font-style:italic; font-size:8pt; }
  td.double-first  { border-bottom:2px dashed #aaa; }
  td.double-second { border-top:none; background:#fafafa; }
  .cell-subject { font-weight:bold; font-size:9pt; }
  .cell-teacher { font-size:8pt; color:#555; margin-top:2px; }
  .cell-class   { font-size:8pt; color:#444; font-style:italic; margin-top:2px; }

  .double-badge { display:inline-block; padding:0 4px; background:#e0e0e0; border-radius:3px; font-size:7pt; font-weight:bold; margin-left:4px; vertical-align:middle; }
  .double-cont  { font-size:8pt; color:#999; font-style:italic; }
  .footer { text-align:center; font-size:8pt; color:#aaa; margin-top:14px; padding-top:8px; border-top:1px solid #ddd; }
  @media print { @page { margin:0; size:landscape; } body { margin:8mm; } }
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
  const header = await getPrintHeader('Class Timetable');
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
      if (!s || !s.subject) return '<td></td>';

      const dblClass = s.is_double_first ? ' double-first' : s.is_double_second ? ' double-second' : '';
      const dblBadge = s.is_double_first ? '<span class="double-badge">×2</span>' : '';
      const contLabel = s.is_double_second ? '<div class="double-cont">↑ continued</div>' : '';

      return `<td class="${dblClass}">
        <div class="cell-subject">${s.subject}${dblBadge}</div>
        ${s.teachers?.name ? `<div class="cell-teacher">Teacher: ${s.teachers.name}</div>` : ''}
        ${contLabel}
      </td>`;
    }).join('');

    return `<tr>
      <td class="time-cell">${cfg.start_time}–${cfg.end_time}<br/><span style="font-weight:normal;font-size:7pt;color:#777">${cfg.label}</span></td>
      ${cells}
    </tr>`;
  }).join('');

  const html = `
    <div class="wrap">
      <div class="school-header-wrap">${header}</div>
      <div class="doc-info">
        <div class="doc-title">${classGrade}${stream ? ` — ${stream}` : ''}</div>
        <div class="doc-sub">${period?.year || ''} Term ${period?.term || ''}</div>
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
 * Print a teacher's personal timetable
 */
export async function printTeacherTimetable({ school, teacher, period, config, slots, activeDays }) {
  const header = await getPrintHeader('Teacher Timetable');
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
      if (!s || !s.subject) return '<td></td>';

      const dblClass = s.is_double_first ? ' double-first' : s.is_double_second ? ' double-second' : '';
      const dblBadge = s.is_double_first ? '<span class="double-badge">×2</span>' : '';
      const contLabel = s.is_double_second ? '<div class="double-cont">↑ continued</div>' : '';

      return `<td class="${dblClass}">
        <div class="cell-subject">${s.subject}${dblBadge}</div>
        <div class="cell-class">${s.class_grade}${s.stream ? ` ${s.stream}` : ''}</div>
        ${contLabel}
      </td>`;
    }).join('');

    return `<tr>
      <td class="time-cell">${cfg.start_time}–${cfg.end_time}<br/><span style="font-weight:normal;font-size:7pt;color:#777">${cfg.label}</span></td>
      ${cells}
    </tr>`;
  }).join('');

  const html = `
    <div class="wrap">
      <div class="school-header-wrap">${header}</div>
      <div class="doc-info">
        <div class="doc-title">${teacher?.name || 'Teacher'}</div>
        <div class="doc-sub">${teacher?.staff_code ? `Staff ID: ${teacher.staff_code} · ` : ''} ${period?.year || ''} Term ${period?.term || ''}</div>
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
    const header = await getPrintHeader('Teacher Timetable');

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
        if (!s || !s.subject) return '<td></td>';
        return `<td>
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
        <div class="school-header-wrap">${header}</div>
        <div class="doc-info">
          <div class="doc-title">${teacher.name}</div>
          <div class="doc-sub">Staff ID: ${teacher.staff_code || '—'} &nbsp;·&nbsp; ${period?.year || ''} Term ${period?.term || ''}</div>
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

