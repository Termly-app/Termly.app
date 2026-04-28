import LegalLayout from './LegalLayout';
import { Helmet } from 'react-helmet-async';

export default function ServiceLevel() {
  return (
    <LegalLayout title="Service Level / Availability Statement" lastUpdated="March 2026">
      <Helmet>
        <title>Service Level Agreement | Termly</title>
        <meta name="description" content="Termly SLA commitment: 99.9% uptime, scheduled maintenance, and responsive support from Nairobi." />
      </Helmet>
      <section>
        <p>Termly is dedicated to providing reliable infrastructure for modern school administration. Our Service Level Statement outlines our commitment to availability.</p>
        
        <h3>1. Uptime Guarantee</h3>
        <p>We strive to maintain a minimum of <strong>99.9% service availability</strong> throughout the academic year. This ensures that your staff can access student records and manage fees whenever needed.</p>
      </section>

      <section>
        <h3>2. Maintenance Windows</h3>
        <p>To keep Termly at the cutting edge, we occasionally perform system updates and maintenance. We aim to schedule these during off-peak hours (typically weekends or late nights EAT). Schools will be notified via email or dashboard notification at least 24 hours in advance of any planned downtime.</p>
      </section>

      <section>
        <h3>3. Support Response</h3>
        <p>Our support team in Nairobi is available Monday through Friday, 8:00 AM to 6:00 PM (EAT). We aim to respond to all critical technical inquiries within 4 business hours.</p>
      </section>
    </LegalLayout>
  );
}
