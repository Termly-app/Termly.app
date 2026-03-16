import LegalLayout from './LegalLayout';

export default function AcceptableUse() {
  return (
    <LegalLayout title="Acceptable Use Policy" lastUpdated="March 2026">
      <section>
        <p>This Acceptable Use Policy (AUP) outlines the rules and guidelines for using the ShuleSoft platform. By using our services, you agree to adhere to these standards to ensure a safe and productive environment for all schools.</p>
        
        <h3>1. Prohibited Conduct</h3>
        <p>Users are strictly prohibited from:</p>
        <ul>
          <li><strong>Illegal Activities:</strong> Using the platform to promote or engage in illegal acts as defined by the Republic of Kenya.</li>
          <li><strong>System Interference:</strong> Attempting to probe, scan, or test the vulnerability of our systems or network without authorization.</li>
          <li><strong>Malicious Software:</strong> Uploading or transmitting viruses, worms, or any code designed to disrupt system functionality.</li>
          <li><strong>Data Misuse:</strong> Accessing or attempting to access student or staff data that you are not authorized to view.</li>
        </ul>
      </section>

      <section>
        <h3>2. Responsible Use</h3>
        <p>School administrators and staff are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of their login credentials.</li>
          <li>Ensuring that all student data entered is accurate and up-to-date.</li>
          <li>Using the platform exclusively for educational and administrative purposes related to their institution.</li>
        </ul>
      </section>

      <section>
        <h3>3. Content Standards</h3>
        <p>Any content uploaded to the platform must not be defamatory, obscene, offensive, or otherwise inappropriate. ShuleSoft reserves the right to remove any content that violates these standards.</p>
      </section>

      <section>
        <h3>4. Enforcement</h3>
        <p>Violation of this AUP may result in immediate suspension or termination of access to ShuleSoft. We reserve the right to report illegal activities to the relevant Kenyan authorities.</p>
      </section>
    </LegalLayout>
  );
}
