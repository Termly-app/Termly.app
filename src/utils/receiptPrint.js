/**
 * receiptPrint.js — Browser-based receipt printing
 *
 * Uses the browser's native print API with a dedicated print window.
 * No PDF library required — works offline, prints correctly to any printer.
 *
 * Usage:
 *   import { printReceipt, printFeeStatement } from '../../utils/receiptPrint';
 *
 *   printReceipt({ school, student, payment, feeItems });
 *   printFeeStatement({ school, student, payments, feeStructure, term });
 */

// ── Shared print styles ───────────────────────────────────────────────────
const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #000; background: #fff; }
  .receipt { max-width: 80mm; margin: 0 auto; padding: 8mm; }
  .statement { max-width: 210mm; margin: 0 auto; padding: 15mm; }
  .school-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .school-name { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
  .school-sub { font-size: 9pt; color: #444; margin-top: 2px; }
  .doc-title { text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: .08em; margin: 8px 0; padding: 4px; border: 1px solid #000; }
  .receipt-no { font-size: 8pt; color: #666; text-align: right; margin-bottom: 8px; }
  .info-row { display: flex; justify-content: space-between; font-size: 9pt; margin: 3px 0; }
  .info-label { color: #555; }
  .info-value { font-weight: bold; }
  .divider { border-top: 1px dashed #999; margin: 8px 0; }
  .solid-divider { border-top: 2px solid #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt; }
  th { text-align: left; padding: 5px 4px; border-bottom: 1px solid #000; font-size: 8pt; text-transform: uppercase; }
  td { padding: 5px 4px; border-bottom: 1px solid #eee; }
  .amount { text-align: right; }
  .total-row td { font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  .balance-box { background: #f5f5f5; border: 1px solid #ccc; padding: 8px; margin: 10px 0; border-radius: 4px; }
  .balance-label { font-size: 9pt; color: #555; }
  .balance-amount { font-size: 11pt; font-weight: bold; }
  .balance-due { color: #555; }
  .balance-clear { color: #060; }
  .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ccc; }
  .stamp-area { border: 1px dashed #ccc; height: 40px; margin-top: 12px; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 8pt; }
  .watermark { position: fixed; bottom: 20mm; right: 20mm; opacity: .06; font-size: 60pt; font-weight: bold; transform: rotate(-35deg); pointer-events: none; }
  @media print {
    @page { margin: 0; }
    body { margin: 8mm; }
    .no-print { display: none !important; }
    .watermark { opacity: .04; }
  }
`;

/**
 * Open a print window and trigger browser print dialog
 */
function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=600,height=800');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PRINT_CSS}</style></head><body>${html}</body></html>`);
  win.document.close();
  // Small delay so styles load before print dialog
  setTimeout(() => {
    win.focus();
    win.print();
    // Close the window after printing (some browsers close automatically)
    win.onafterprint = () => win.close();
  }, 500);
}

/**
 * Format KSh amounts
 */
function ksh(amount) {
  return `KSh ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

/**
 * Format a date nicely
 */
function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Generate receipt number from payment id
 */
function receiptNo(paymentId) {
  const pid = String(paymentId || '');
  if (pid.startsWith('RCT-')) return pid;
  const suffix = pid ? pid.slice(-6).toUpperCase() : Math.random().toString(36).slice(-6).toUpperCase();
  return `RCT-${new Date().getFullYear()}-${suffix}`;
}

// ══════════════════════════════════════════════════════════════════════════
/**
 * Print a single payment receipt (thermal/A4)
 *
 * @param {Object} opts
 * @param {Object} opts.school    — { name, location, phone, email }
 * @param {Object} opts.student   — { name, admission_number, grade, class }
 * @param {Object} opts.payment   — { id, amount, transaction_code, created_at, method, status }
 * @param {Array}  opts.feeItems  — [{ name, amount }] — breakdown of what was paid
 */
export function printReceipt({ school, student, payment, feeItems = [] }) {
  const rNo     = receiptNo(payment?.id);
  const total   = payment?.amount || 0;
  const billed  = payment?.totalFee || 0; // Passed from Fees.jsx
  const balance = (payment?.balance !== undefined) ? payment.balance : 0;

  const previousPaid = Math.max(0, billed - balance - total);

  const feeRows = `
    <tr><td>Term Fee (Total Required)</td><td class="amount">${ksh(billed)}</td></tr>
    ${previousPaid > 0 ? `<tr><td>Amount Paid Previously</td><td class="amount">${ksh(previousPaid)}</td></tr>` : ''}
    <tr><td>Amount Paid This Transaction</td><td class="amount" style="font-weight:bold; color:#060">${ksh(total)}</td></tr>
  `;

  const html = `
    <div class="receipt">
      <div class="watermark">PAID</div>

      <!-- School header -->
      <div class="school-header">
        <div class="school-name">${school?.name || 'School Name'}</div>
        <div class="school-sub">${school?.location || ''}</div>
        ${school?.phone ? `<div class="school-sub">📞 ${school.phone}</div>` : ''}
      </div>

      <div class="doc-title">Official Payment Receipt</div>
      <div class="receipt-no">Receipt No: <strong>${rNo}</strong></div>

      <!-- Student info -->
      <div class="info-row"><span class="info-label">Adm No:</span><span class="info-value"><strong>${student?.admission_number || '—'}</strong></span></div>
      <div class="info-row"><span class="info-label">Student:</span><span class="info-value">${student?.name || '—'}</span></div>
      <div class="info-row"><span class="info-label">Class:</span><span class="info-value">${student?.grade || student?.class || '—'}</span></div>
      <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${fmt(payment?.created_at || new Date())}</span></div>

      <div class="divider"></div>

      <!-- Fee breakdown -->
      <table>
        <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
        <tbody>${feeRows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td>Total Paid</td>
            <td class="amount">${ksh(total)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Payment method -->
      <div class="info-row" style="margin-top:6px">
        <span class="info-label">Payment Method:</span>
        <span class="info-value">${payment?.method || 'M-PESA'}</span>
      </div>
      ${payment?.transaction_code ? `
      <div class="info-row">
        <span class="info-label">Transaction Code:</span>
        <span class="info-value">${payment.transaction_code}</span>
      </div>` : ''}

      <!-- Balance -->
      <div class="balance-box">
        <div class="balance-label">Outstanding Balance</div>
        <div class="balance-amount ${balance > 0 ? 'balance-due' : 'balance-clear'}">
          ${balance > 0 ? ksh(balance) : 'CLEARED'}
        </div>
      </div>

      <div class="stamp-area">Authorised Signature / School Stamp</div>

      <div class="footer">
        This is a computer-generated receipt.<br>
        ${school?.name || 'School'} · ${new Date().getFullYear()}
      </div>
    </div>`;

  openPrintWindow(html);
}

// ══════════════════════════════════════════════════════════════════════════
/**
 * Print a full-page fee statement for a student (A4)
 *
 * @param {Object} opts
 * @param {Object} opts.school        — school info
 * @param {Object} opts.student       — student info
 * @param {Array}  opts.payments      — all payments for this student this term
 * @param {Array}  opts.feeStructure  — [{ name, amount, is_mandatory }] expected fees
 * @param {string} opts.term          — e.g. 'Term 1 2025'
 */
export function printFeeStatement({ school, student, payments = [], feeStructure = [], term = '' }) {
  const totalBilled  = feeStructure.reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid    = payments.filter(p => p.status === 'Approved').reduce((s, p) => s + (p.amount || 0), 0);
  const balance      = Math.max(0, totalBilled - totalPaid);
  const isCleared    = balance === 0 && totalBilled > 0;

  const feeRows = feeStructure.map(fee => `
    <tr>
      <td>${fee.name}</td>
      <td class="amount">${ksh(fee.amount)}</td>
      <td style="text-align:center">${fee.is_mandatory !== false ? 'Mandatory' : 'Optional'}</td>
    </tr>`).join('');

  const paymentRows = payments.map(p => `
    <tr>
      <td>${fmt(p.created_at)}</td>
      <td>${p.transaction_code || '—'}</td>
      <td>${p.method || 'M-PESA'}</td>
      <td class="amount" style="color:#060">${ksh(p.amount)}</td>
      <td style="text-align:center">
        <span style="padding:2px 7px;border-radius:3px;font-size:8pt;background:${p.status==='Approved'?'#e6f4ea':'#fce8ec'};color:${p.status==='Approved'?'#060':'#c00'}">
          ${p.status}
        </span>
      </td>
    </tr>`).join('');

  const html = `
    <div class="statement">
      <!-- School header -->
      <div class="school-header">
        <div class="school-name">${school?.name || 'School Name'}</div>
        <div class="school-sub">${school?.location || ''}</div>
        ${school?.phone ? `<div class="school-sub">📞 ${school.phone}</div>` : ''}
      </div>

      <div class="doc-title">Student Fee Statement${term ? ` — ${term}` : ''}</div>

      <!-- Student info grid -->
      <table style="margin-bottom:12px">
        <tr>
          <td><span style="color:#555">Admission No:</span> <strong>${student?.admission_number || '—'}</strong></td>
          <td><span style="color:#555">Student Name:</span> <strong>${student?.name || '—'}</strong></td>
        </tr>
        <tr>
          <td><span style="color:#555">Class:</span> <strong>${student?.grade || student?.class || '—'}</strong></td>
          <td><span style="color:#555">Statement Date:</span> <strong>${fmt(new Date())}</strong></td>
        </tr>
        ${student?.guardian_name ? `<tr><td colspan="2"><span style="color:#555">Guardian:</span> <strong>${student.guardian_name}</strong> ${student.guardian_phone ? `(${student.guardian_phone})` : ''}</td></tr>` : ''}
      </table>

      <!-- Fee structure -->
      <div style="font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Fee Schedule</div>
      <table>
        <thead><tr><th>Fee Item</th><th class="amount">Amount</th><th style="text-align:center">Type</th></tr></thead>
        <tbody>${feeRows || '<tr><td colspan="3" style="color:#999;text-align:center">No fee structure defined</td></tr>'}</tbody>
        <tfoot>
          <tr class="total-row">
            <td>Total Billed</td>
            <td class="amount">${ksh(totalBilled)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <!-- Payment history -->
      <div style="font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px">Payment History</div>
      <table>
        <thead><tr><th>Date</th><th>Code</th><th>Method</th><th class="amount">Amount</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${paymentRows || '<tr><td colspan="5" style="color:#999;text-align:center">No payments recorded</td></tr>'}</tbody>
      </table>

      <!-- Summary box -->
      <div style="display:flex;gap:12px;margin-top:14px">
        <div class="balance-box" style="flex:1">
          <div class="balance-label">Total Billed</div>
          <div class="balance-amount">${ksh(totalBilled)}</div>
        </div>
        <div class="balance-box" style="flex:1">
          <div class="balance-label">Total Paid</div>
          <div class="balance-amount balance-clear">${ksh(totalPaid)}</div>
        </div>
        <div class="balance-box" style="flex:1">
          <div class="balance-label">Balance Due</div>
          <div class="balance-amount ${isCleared ? 'balance-clear' : 'balance-due'}">
            ${isCleared ? 'CLEARED' : ksh(balance)}
          </div>
        </div>
      </div>

      <div class="stamp-area" style="margin-top:20px">Bursar's Signature &amp; School Stamp</div>

      <div class="footer">
        This statement was generated by School Management System · ${school?.name || ''} · ${new Date().toLocaleDateString('en-KE')}
      </div>
    </div>`;

  openPrintWindow(html);
}
