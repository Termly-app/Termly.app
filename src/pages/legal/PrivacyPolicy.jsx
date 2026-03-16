import LegalLayout from './LegalLayout';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="March 2026">
      <section>
        <p>At ShuleSoft, we are committed to protecting the privacy and security of the data entrusted to us by schools, students, and parents. This Privacy Policy outlines how we collect, use, and safeguard information.</p>
        
        <h3>1. Data Collection</h3>
        <p>We collect information necessary to provide a comprehensive school management experience, including:</p>
        <ul>
          <li><strong>School Information:</strong> Institution name, address, and administrative contact details.</li>
          <li><strong>Student Records:</strong> Personal details, academic performance, attendance, and health records as provided by the school.</li>
          <li><strong>Parent/Guardian Data:</strong> Names, contact information, and M-Pesa payment references for fee management.</li>
          <li><strong>Staff Profiles:</strong> Employee details and administrative access logs.</li>
        </ul>
      </section>

      <section>
        <h3>2. How We Use Data</h3>
        <p>Information collected via ShuleSoft is used exclusively for:</p>
        <ul>
          <li>Facilitating day-to-day school operations and record-keeping.</li>
          <li>Generating academic reports and performance analytics.</li>
          <li>Automating communication via SMS alerts for attendance and fee reminders.</li>
          <li>Processing fee payments through secure integrations like M-Pesa.</li>
          <li>Improving system performance and user experience for Kenyan educators.</li>
        </ul>
      </section>

      <section>
        <h3>3. Data Security & "Kaulani Shield"</h3>
        <p>We implement industry-leading security measures to protect your institution's intelligence:</p>
        <ul>
          <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using 256-bit SSL encryption.</li>
          <li><strong>Access Controls:</strong> Granular, role-based access ensures that sensitive data is only visible to authorized personnel.</li>
          <li><strong>Regular Backups:</strong> Automated daily backups are performed to ensure data recovery in case of emergencies.</li>
        </ul>
      </section>

      <section>
        <h3>4. Data Sharing & Third Parties</h3>
        <p>ShuleSoft maintains a strict non-distribution policy:</p>
        <ul>
          <li>We <strong>never</strong> sell or lease school data to third-party advertisers or data brokers.</li>
          <li>Data is only shared with authorized institutional users within your specific school.</li>
          <li>We may disclose information only if required by Kenyan law or to protect the safety of students and staff.</li>
        </ul>
      </section>

      <section>
        <h3>5. Contact Us</h3>
        <p>If you have questions about our privacy practices, please contact our data protection team at <a href="mailto:support@kaulanicorp.com" style={{ color: 'inherit' }}>support@kaulanicorp.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
