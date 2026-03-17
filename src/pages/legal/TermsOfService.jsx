import LegalLayout from './LegalLayout';

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="March 2026">
      <section>
        <p>Welcome to ShuleSoft. These Terms of Service ("Terms") govern your use of the ShuleSoft school management platform. By registering a school account or accessing our services, you agree to comply with these terms.</p>
        
        <h3>1. Description of Service</h3>
        <p>ShuleSoft provides a cloud-based school management system for student records, academic grading (including CBC), and financial tracking with M-PESA integration.</p>
      </section>

      <section>
        <h3>2. Account Registration & Security</h3>
        <p>Schools must provide accurate identity and contact details during registration. The school administrator is responsible for:</p>
        <ul>
          <li>Providing accurate institutional information</li>
          <li>Maintaining account and password security</li>
          <li>Managing access and permissions for staff members</li>
        </ul>
        <p>ShuleSoft is not liable for any unauthorized access resulting from your failure to secure your administrator credentials.</p>
      </section>

      <section>
        <h3>3. Subscription Plans & Payments</h3>
        <p>Access to ShuleSoft is provided on a termly subscription basis (Starter, Pro, or Elite). Subscriptions are charged per academic term.</p>
        <p><strong>M-PESA Payments:</strong> All payments must be made to the authorized Paybill/Business number. You must provide a valid transaction code for verification.</p>
        <p><strong>Exceeding Limits:</strong> If your student population exceeds your plan's limit, you will be required to upgrade to the appropriate tier to maintain full functionality.</p>
        <p><strong>Refunds:</strong> Subscription fees are generally non-refundable once the academic term has commenced and services have been utilized.</p>
      </section>

      <section>
        <h3>4. Usage Data & Privacy</h3>
        <p>Schools retain full ownership of the student and staff data they upload. ShuleSoft will not access, use, or share your school's data except to provide services, perform maintenance, or as required by law.</p>
        <p>For more details, please review our <a href="/legal/privacy" style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</a>.</p>
      </section>

      <section>
        <h3>5. Prohibited Use</h3>
        <p>Users agree not to:</p>
        <ul>
          <li>Use ShuleSoft for any illegal activity under Kenyan law.</li>
          <li>Attempt to reverse engineer, hack, or disrupt the platform's security measures.</li>
          <li>Misuse or export student data for unauthorized third-party use.</li>
          <li>Provide false information during school registration.</li>
        </ul>
        <p>Violation of these rules may result in immediate account suspension or termination.</p>
      </section>

      <section>
        <h3>6. Termination</h3>
        <p>You may cancel your subscription at any time. ShuleSoft reserves the right to suspend or terminate accounts for non-payment or significant violation of these Terms.</p>
      </section>

      <section>
        <h3>7. Limitation of Liability</h3>
        <p>ShuleSoft is provided "as is". While we strive for 100% uptime, we are not liable for any operational disruption, loss of data, or financial loss resulting from the use or inability to use the platform.</p>
      </section>

      <section>
        <h3>8. Contact Information</h3>
        <p>For technical support or questions regarding these terms:</p>
        <p>
          Email: <a href="mailto:shulesoft@gmail.com" style={{ color: 'inherit', fontWeight: 600 }}>shulesoft@gmail.com</a>
        </p>
      </section>

      <section>
        <h3>11. Acceptance of Terms</h3>
        <p>By creating an account or using ShuleSoft, you agree to these Terms of Service.</p>
      </section>
    </LegalLayout>
  );
}
