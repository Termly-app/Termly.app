import PremiumLayout from '../components/PremiumLayout';
import { Helmet } from 'react-helmet-async';

export default function AboutUs() {
  return (
    <PremiumLayout>
      <Helmet>
        <title>About Us | ShuleSoft — Digitizing Kenyan Education</title>
        <meta name="description" content="ShuleSoft is an operating system for the future of Kenyan schools. Learn about our mission to digitize education management across Kenya." />
        <meta name="keywords" content="ShuleSoft, about, Kenya education technology, school management, CBC, ShuleSoft HQ" />
        <link rel="canonical" href="https://shulesoft.com/about" />
      </Helmet>
      <section className="section">
        <div className="sec-head reveal">
          <div className="eyebrow">Our Story</div>
          <h2 className="landing-h2">Digitizing the heart <br/><span className="h1-dim">of Kenyan Education</span></h2>
          <p className="sec-p">ShuleSoft is more than a management tool—it's an operating system for the future of Kenyan schools.</p>
        </div>

        <div className="feat-grid" style={{ maxWidth: 900, margin: '60px auto 0' }}>
          <div className="fc reveal">
            <div className="fc-title">Our Vision</div>
            <p className="fc-desc">We envision a Kenya where every school, from rural outposts to Nairobi's busiest hubs, has access to world-class administrative technology. We believe that by removing the burden of paperwork, we empower teachers to focus on what matters: the students.</p>
          </div>

          <div className="fc reveal reveal-delay-1">
            <div className="fc-title">The ShuleSoft Mission</div>
            <p className="fc-desc">ShuleSoft was developed with a simple goal: to build software that understands the Kenyan context. From CBC compliance to M-Pesa integration, we build for the real-world needs of Kenyan educators.</p>
          </div>

          <div className="fc reveal reveal-delay-2">
            <div className="fc-title">Innovation in Nairobi</div>
            <p className="fc-desc">Headquartered in Nairobi, our team of engineers and educational experts works daily to ensure ShuleSoft remains the most reliable, secure, and user-friendly platform in the region. We are proud to be part of Kenya's growing tech ecosystem.</p>
          </div>
        </div>
      </section>
    </PremiumLayout>
  );
}
