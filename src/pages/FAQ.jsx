import PremiumLayout from '../components/PremiumLayout';
import { Helmet } from 'react-helmet-async';

export default function FAQ() {
  return (
    <PremiumLayout>
      <Helmet>
        <title>FAQ | ShuleSoft — Frequently Asked Questions</title>
        <meta name="description" content="Answers to common questions about ShuleSoft, CBC compliance, payments, offline use, data ownership, and teacher training." />
        <link rel="canonical" href="https://shulesoft.com/faq" />
      </Helmet>
      <section className="section">
        <div className="sec-head reveal">
          <div className="eyebrow">FAQ</div>
          <h2 className="landing-h2">Answers to your questions.</h2>
          <p className="sec-p">Everything you need to know about starting with ShuleSoft.</p>
        </div>

        <div className="faq-grid">
          <div className="faq-item reveal">
            <h3>Is ShuleSoft fully compliant with the Kenyan CBC?</h3>
            <p>Yes. Our grading modules are custom-built to support the Competency-Based Curriculum, including stage assessments and performance tracking across all 14 Key Stages.</p>
          </div>

          <div className="faq-item reveal reveal-delay-1">
            <h3>How do we pay our subscription?</h3>
            <p>We've integrated local payment methods including M-Pesa Business Till, Bank Transfers, and mobile-money reconciliations to make fee management effortless for Kenyan schools.</p>
          </div>

          <div className="faq-item reveal reveal-delay-2">
            <h3>Can we use ShuleSoft without internet?</h3>
            <p>ShuleSoft is a cloud-native platform, ensuring your data is always backed up and accessible from any device. We recommend a stable 4G/5G or fiber connection for the best experience.</p>
          </div>

          <div className="faq-item reveal reveal-delay-3">
            <h3>What happens to our data if we stop using ShuleSoft?</h3>
            <p>Under our Terms, your data remains yours. You can export your student records and academic data at any time. We never sell or share your school's private intelligence.</p>
          </div>

          <div className="faq-item reveal reveal-delay-4">
            <h3>Do you offer training for our teachers?</h3>
            <p>Absolutely. Every new "School" and "Prestige" account includes onboarding for your staff.</p>
          </div>
        </div>
      </section>
    </PremiumLayout>
  );
}
