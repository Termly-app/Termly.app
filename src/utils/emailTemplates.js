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

const BASE_TEMPLATE = `
  <style>
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .header { background: ${BRAND_COLORS.primary}; padding: 40px 20px; text-align: center; color: #ffffff; }
    .body { padding: 40px; }
    .receipt-card { background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
    .btn { display: inline-block; padding: 14px 28px; background: ${BRAND_COLORS.primary}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; }
  </style>
`;

export function getWelcomeTemplate({ adminName, schoolName, loginUrl = 'https://termly-app.vercel.app/login' }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${BASE_TEMPLATE}
    </head>
    <body style="${BASE_STYLE}">
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">Welcome to Termly</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Your School Management Platform</p>
        </div>
        <div class="body">
          <p>Dear ${adminName || 'Admin'},</p>
          <p>Welcome to Termly! We are thrilled to have <strong>${schoolName || 'your school'}</strong> on board.</p>
          <p>Your admin account has been successfully created. Termly is designed to streamline your school's daily operations. Your platform has been provisioned with the requested features enabled and ready to use.</p>
          <p style="text-align: center; margin-top: 32px; margin-bottom: 32px;">
            <a href="${loginUrl}" class="btn">Log In to Dashboard</a>
          </p>
          <p>If there are features you expect that are not enabled, or if you need any assistance getting started, our support team is ready to help.</p>
          <p>Best regards,<br>The Termly Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Termly &middot; Streamlining Education
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetTemplate({ name, schoolName, resetUrl }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${BASE_TEMPLATE}
    </head>
    <body style="${BASE_STYLE}">
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">Reset Your Password</h1>
        </div>
        <div class="body">
          <p>Dear ${name || 'User'},</p>
          <p>We received a request to reset the password for your Termly account associated with <strong>${schoolName || 'your school'}</strong>.</p>
          <p>If you made this request, please click the button below to set a new password:</p>
          <p style="text-align: center; margin-top: 32px; margin-bottom: 32px;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </p>
          <p>If you did not request a password reset, you can safely ignore this email. Your account remains secure.</p>
          <p>Best regards,<br>The Termly Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Termly &middot; Secure Login
        </div>
      </div>
    </body>
    </html>
  `;
}
