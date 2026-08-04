import LegalLayout from './LegalLayout';
import { Helmet } from 'react-helmet-async';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="March 2026">
      <Helmet>
        <title>Privacy Policy | Termly — Kenya Data Protection</title>
        <meta name="description" content="How Termly collects, uses, and protects your school's data. Compliant with the Kenya Data Protection Act 2019." />
        <link rel="canonical" href="https://Termly.com/legal/privacy" />
      </Helmet>
      <section>
        <p>Termly is committed to protecting the privacy and security of the data entrusted to us by schools in Kenya. This policy explains how we collect, use, and safeguard your institution's information.</p>
        
        <h3>1. Information We Collect</h3>
        <ul>
          <li><strong>School Identity:</strong> Name, physical location, and official contact details.</li>
          <li><strong>Administrative Data:</strong> Names and emails of school staff and administrators.</li>
          <li><strong>Student Records:</strong> Names, grades, and academic performance data provided by the school.</li>
          <li><strong>Financial Records:</strong> Fee payment history and M-PESA transaction codes submitted for verification.</li>
        </ul>
      </section>

      <section>
        <h3>2. How We Use Data</h3>
        <p>Information collected via Termly is used exclusively for:</p>
        <ul>
          <li>Providing high-quality school management and record-keeping features.</li>
          <li>Processing termly subscriptions and verifying M-PESA payments.</li>
          <li>Providing technical support and troubleshooting.</li>
          <li>Improving platform performance and developing new features for Kenyan educators.</li>
        </ul>
      </section>

      <section>
        <h3>3. Data Security & Isolation</h3>
        <p>We implement industry-standard security measures to protect your school's data:</p>
        <ul>
          <li><strong>Encryption:</strong> All data is encrypted in transit using SSL and at rest within our secure cloud database.</li>
          <li><strong>Tenancy Isolation:</strong> We use Row-Level Security (RLS) to ensure that your school's data is logically separated and never visible to other schools.</li>
          <li><strong>Access Controls:</strong> Only authorized administrators within your school can access your specific workspace.</li>
        </ul>
      </section>

      <section>
        <h3>4. Data Ownership & Sharing</h3>
        <p>Schools retain 100% ownership of all data uploaded to Termly. We maintain a strict privacy policy:</p>
        <ul>
          <li>We <strong>never</strong> sell or lease school data to third-party advertisers or brokers.</li>
          <li>Data is only shared with authorized institutional users within your school.</li>
          <li>We disclosure information only if required by Kenyan law or to protect system integrity.</li>
        </ul>
      </section>

      <section>
        <h3>5. Your Rights under KDP Act 2019</h3>
        <p>Under the Kenya Data Protection Act 2019, you have the right to:</p>
        <ul>
          <li>Access your personal data held by us.</li>
          <li>Rectify inaccurate or incomplete data.</li>
          <li>Request erasure of data where it is no longer necessary.</li>
          <li>Object to processing or request restriction of processing.</li>
          <li>Data portability in a structured, commonly used format.</li>
        </ul>
      </section>

      <section>
        <h3>6. Data Retention</h3>
        <p>Student records are maintained for the duration of enrolment plus 3 years. Upon account termination, data is deleted after a 30-day grace period unless retention is required by law.</p>
      </section>

      <section>
        <h3>7. Third-Party Processors</h3>
        <p>We use the following sub-processors to provide our services:</p>
        <ul>
          <li><strong>Supabase:</strong> Database and Authentication hosting.</li>
          <li><strong>Resend:</strong> Transactional email delivery.</li>
          <li><strong>Africa's Talking:</strong> SMS notification delivery.</li>
          <li><strong>Sentry/PostHog:</strong> Performance monitoring and error tracking (Non-PII only).</li>
        </ul>
      </section>

      <section>
        <h3>8. Contact & DPO</h3>
        <p>For any privacy-related inquiries, please contact our Data Protection Officer:</p>
        <p><strong>Email:</strong> <a href="mailto:shulesoft8@gmail.com" style={{ color: 'var(--primary)' }}>shulesoft8@gmail.com</a></p>
        <p><strong>Address:</strong> Termly, Nairobi, Kenya</p>
        <p>You also have the right to lodge a complaint with the <strong>Office of the Data Protection Commissioner (ODPC)</strong> at <a href="https://www.odpc.go.ke" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>www.odpc.go.ke</a>.</p>
      </section>
    </LegalLayout>
  );
}
