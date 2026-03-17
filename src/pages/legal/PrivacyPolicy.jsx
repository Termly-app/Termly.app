import LegalLayout from './LegalLayout';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="March 2026">
      <section>
        <p>ShuleSoft is committed to protecting the privacy and security of the data entrusted to us by schools in Kenya. This policy explains how we collect, use, and safeguard your institution's information.</p>
        
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
        <p>Information collected via ShuleSoft is used exclusively for:</p>
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
        <p>Schools retain 100% ownership of all data uploaded to ShuleSoft. We maintain a strict privacy policy:</p>
        <ul>
          <li>We <strong>never</strong> sell or lease school data to third-party advertisers or brokers.</li>
          <li>Data is only shared with authorized institutional users within your school.</li>
          <li>We disclosure information only if required by Kenyan law or to protect system integrity.</li>
        </ul>
      </section>

      <section>
        <h3>5. Contact Us</h3>
        <p>If you have questions about our privacy practices or your data, please contact us at:</p>
        <p>
          Email: <a href="mailto:shulesoft@gmail.com" style={{ color: 'inherit', fontWeight: 600 }}>shulesoft@gmail.com</a>
        </p>
      </section>
    </LegalLayout>
  );
}
