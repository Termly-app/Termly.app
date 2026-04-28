import LegalLayout from './LegalLayout';
import { Helmet } from 'react-helmet-async';

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="March 2026">
      <Helmet>
        <title>Refund Policy | Termly</title>
        <meta name="description" content="Termly subscription refund policy for Kenyan schools. Learn about our non-refundable terms and exceptional circumstances." />
      </Helmet>
      <section>
        <p>At Termly, we strive to provide the best possible service for Kenyan schools. Please review our policy regarding subscription refunds.</p>
        
        <h3>1. Subscription Commitment</h3>
        <p>Termly operates on a subscription-per-term model. Payments made for a specific academic term are generally <strong>non-refundable</strong> once the service has been activated and data management has commenced.</p>
      </section>

      <section>
        <h3>2. Exceptional Circumstances</h3>
        <p>We understand that unique situations may arise. Termly may review refund requests on a case-by-case basis under the following conditions:</p>
        <ul>
          <li><strong>Extended System Outage:</strong> Technical failures originating from our infrastructure that prevent system access for more than 7 consecutive business days.</li>
          <li><strong>Billing Errors:</strong> Proven instances of duplicate billing or incorrect charges.</li>
        </ul>
      </section>

      <section>
        <h3>3. Request Process</h3>
        <p>To request a review of your subscription, please submit a written request to <a href="mailto:Termly8@gmail.com" style={{ color: 'inherit', fontWeight: 600 }}>Termly8@gmail.com</a> within 14 days of the payment date. Please include your school name and proof of payment.</p>
      </section>
    </LegalLayout>
  );
}
