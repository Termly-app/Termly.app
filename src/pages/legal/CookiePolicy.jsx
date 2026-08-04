import LegalLayout from './LegalLayout';
import { Helmet } from 'react-helmet-async';

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="March 2026">
      <Helmet>
        <title>Cookie Policy | Termly</title>
        <meta name="description" content="Termly Cookie Policy. Understand how we use cookies and tracking technologies to improve your experience." />
      </Helmet>
      <section>
        <p>This Cookie Policy explains how Termly uses cookies and similar technologies to recognize you when you visit our platform. It explains what these technologies are and why we use them, as well as your rights to control our use of them.</p>
        
        <h3>1. What are cookies?</h3>
        <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by online service providers to facilitate and help to make the interaction between users and websites faster and easier.</p>
      </section>

      <section>
        <h3>2. Why do we use cookies?</h3>
        <p>We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our platform to operate (Essential Cookies). Other cookies enable us to track and target the interests of our users to enhance the experience on our platform (Analytics Cookies).</p>
        <ul>
          <li><strong>Essential Cookies:</strong> Strictly necessary for the operation of Termly (e.g., authentication, session management).</li>
          <li><strong>Performance and Functionality Cookies:</strong> Used to enhance the performance and functionality of our platform but are non-essential to their use.</li>
          <li><strong>Analytics and Customization Cookies:</strong> Collect information that is used either in aggregate form to help us understand how our platform is being used or how effective our marketing campaigns are.</li>
        </ul>
      </section>

      <section>
        <h3>3. How can I control cookies?</h3>
        <p>You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our platform though your access to some functionality and areas may be restricted.</p>
      </section>

      <section>
        <h3>4. Updates to this policy</h3>
        <p>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons.</p>
      </section>
      
      <section>
        <h3>5. Contact Us</h3>
        <p>If you have any questions about our use of cookies or other technologies, please contact us at <a href="mailto:shulesoft8@gmail.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>shulesoft8@gmail.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
