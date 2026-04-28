import PremiumLayout from '../components/PremiumLayout';
import { Helmet } from 'react-helmet-async';

export default function SecurityTrust() {
  return (
    <PremiumLayout>
      <Helmet>
        <title>Security & Trust | Termly — Bank-Grade Data Protection</title>
        <meta name="description" content="Termly uses 256-bit encryption, automated backups, zero-trust access, and row-level security to protect your school's data." />
        <link rel="canonical" href="https://Termly.com/security" />
      </Helmet>
      <section className="section">
        <div className="sec-head reveal">
          <div className="eyebrow">Security & Trust</div>
          <h2 className="landing-h2">Your school's intelligence,<br/><span className="h1-dim">protected by Termly Shield.</span></h2>
          <p className="sec-p">Protecting student data and institutional records is our highest priority. We employ bank-grade security across our entire infrastructure.</p>
        </div>

        <div className="feat-grid" style={{ marginTop: 60 }}>
          <div className="fc reveal">
            <div className="fc-title">256-bit Encryption</div>
            <p className="fc-desc">All data transmitted between your school and our servers is shielded by industry-standard SSL encryption, ensuring that sensitive information remains confidential at all times.</p>
          </div>
          <div className="fc reveal reveal-delay-1">
            <div className="fc-title">Automated Backups</div>
            <p className="fc-desc">We perform daily, encrypted backups of your entire system. Even in the event of hardware failure at your school, your records are safely preserved in the cloud.</p>
          </div>
          <div className="fc reveal reveal-delay-2">
            <div className="fc-title">Zero-Trust Access</div>
            <p className="fc-desc">Granular permissions ensure that only authorized staff members can access specific modules. You define the roles; we enforce the security.</p>
          </div>
          <div className="fc reveal reveal-delay-3">
            <div className="fc-title">99.9% Uptime</div>
            <p className="fc-desc">Our infrastructure is hosted on world-class, redundant servers, ensuring that Termly is ready for your teachers, students, and parents at any hour.</p>
          </div>
        </div>

        <div className="sec-head reveal" style={{ marginTop: 100 }}>
          <h3 className="landing-h2" style={{ fontSize: '2rem' }}>Our Privacy Promise</h3>
          <p className="sec-p">Termly will never sell or lease student data to third-party advertisers. Your data belongs to your school. We are merely the custodians of your digital excellence.</p>
        </div>
      </section>
    </PremiumLayout>
  );
}
