// ============================================================================
// EMAIL TEMPLATES — Domain 10
// Responsive, branded HTML templates for Resend integration.
// ============================================================================

export const BRAND_COLORS = {
  primary: '#5B3EF5',
  secondary: '#0EA5E9',
  text: '#1E293B',
  bg: '#F8FAFC'
};

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: ${BRAND_COLORS.text};
  background-color: ${BRAND_COLORS.bg};
  margin: 0;
  padding: 0;
`;

export function getFeeReceiptTemplate({ studentName, amount, balance, reference, schoolName }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .header { background: ${BRAND_COLORS.primary}; padding: 40px 20px; text-align: center; color: #ffffff; }
        .body { padding: 40px; }
        .receipt-card { background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; }
        .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
        .btn { display: inline-block; padding: 14px 28px; background: ${BRAND_COLORS.primary}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; }
      </style>
    </head>
    <body style="${BASE_STYLE}">
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">Payment Received</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">${schoolName}</p>
        </div>
        <div class="body">
          <p>Dear Parent,</p>
          <p>We have successfully received a payment for <strong>${studentName}</strong>.</p>
          
          <div class="receipt-card">
            <table width="100%">
              <tr>
                <td style="color: #64748b; font-size: 14px;">Amount Paid</td>
                <td style="text-align: right; font-weight: bold; font-size: 18px;">KSh ${amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 14px; padding-top: 12px;">Reference</td>
                <td style="text-align: right; padding-top: 12px;">${reference}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 14px; padding-top: 12px;">Outstanding Balance</td>
                <td style="text-align: right; padding-top: 12px; color: #ef4444; font-weight: bold;">KSh ${balance.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="text-align: center;">
            <a href="https://portal.Termly.app" class="btn">View Full Statement</a>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${schoolName} &middot; Powered by Termly
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getExamResultsTemplate({ studentName, term, year, performance, schoolName }) {
  // performance: [{ subject, mark, grade }]
  const rows = performance.map(p => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">${p.subject}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.mark}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${p.grade}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .header { background: ${BRAND_COLORS.secondary}; padding: 40px 20px; text-align: center; color: #ffffff; }
        .body { padding: 40px; }
        .results-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
        .btn { display: inline-block; padding: 14px 28px; background: ${BRAND_COLORS.secondary}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; }
      </style>
    </head>
    <body style="${BASE_STYLE}">
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">Exam Results Released</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">${term}, ${year} &middot; ${schoolName}</p>
        </div>
        <div class="body">
          <p>Dear Parent,</p>
          <p>The academic results for <strong>${studentName}</strong> have been released.</p>
          
          <table class="results-table">
            <thead>
              <tr style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                <th align="left">Subject</th>
                <th align="center">Mark</th>
                <th align="right">Grade</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <p style="text-align: center; margin-top: 32px;">
            <a href="https://portal.Termly.app" class="btn">Download Report Card</a>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${schoolName} &middot; Powered by Termly
        </div>
      </div>
    </body>
    </html>
  `;
}
