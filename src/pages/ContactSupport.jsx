import { useState, useEffect } from 'react';
import PremiumLayout from '../components/PremiumLayout';
import { Helmet } from 'react-helmet-async';
import { getPlatformSettings } from '../data/coreStore';;

export default function ContactSupport() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function load() {
      const s = await getPlatformSettings();
      setSettings(s);
    }
    load();
  }, []);

  return (
    <PremiumLayout>
      <Helmet>
        <title>Contact Support | Termly</title>
        <meta name="description" content="Get help from the Termly team in Nairobi. Contact us for technical support, onboarding, and account questions." />
        <link rel="canonical" href="https://Termly.com/contact" />
      </Helmet>
      <section className="section">
        <div className="sec-head reveal">
          <div className="eyebrow">Support</div>
          <h2 className="landing-h2">How can we help?</h2>
          <p className="sec-p">We're here to help you run your school efficiently. Reach out to our team in Nairobi.</p>
        </div>

        <div className="feat-grid" style={{ maxWidth: 800, margin: '60px auto 0' }}>
          <div className="fc reveal">
            <div className="fc-title">Support Hours</div>
            <p className="fc-desc">
              Monday – Friday<br />
              8:00 AM – 6:00 PM (EAT)
            </p>
          </div>
          
          <div className="fc reveal reveal-delay-1">
            <div className="fc-title">Direct Contact</div>
            <p className="fc-desc">
              <strong>Phone:</strong> <a href={`tel:${settings?.support?.phone || '+254712260057'}`} style={{ color: 'inherit' }}>{settings?.support?.phone || '+254712260057'}</a><br/>
              <strong>Email:</strong> <a href="mailto:shulesoft8@gmail.com" style={{ color: 'inherit' }}>shulesoft8@gmail.com</a>
            </p>
          </div>
        </div>
      </section>
    </PremiumLayout>
  );
}
