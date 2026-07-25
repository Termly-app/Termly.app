import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PremiumLayout from '../components/PremiumLayout';
import { supabase } from '../lib/supabase';
import { PhoneIcon, MessageIcon, CheckIcon, SchoolIcon, RocketIcon } from '../components/CommonIcons';

export default function BookDemo() {
  const [form, setForm] = useState({
    schoolName: '', contactName: '', email: '', phone: '', studentCount: '', message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.schoolName || !form.contactName || !form.email || !form.phone) {
      setError('School name, your name, email, and phone are required.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('demo_requests').insert({
        school_name: form.schoolName,
        contact_name: form.contactName,
        email: form.email,
        phone: form.phone,
        student_count: form.studentCount || null,
        message: form.message || null,
      });
      if (insertError) throw insertError;
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong — please try again, or reach us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PremiumLayout>
      <Helmet>
        <title>Book a Demo | Termly</title>
        <meta name="description" content="Tell us about your school and we'll set up a short demo — no self-signup, we get you set up personally." />
        <link rel="canonical" href="https://Termly.com/book-demo" />
      </Helmet>

      <style>{`
        .demo-section {
          padding: 50px 24px 100px;
          max-width: 1140px;
          margin: 0 auto;
        }
        .demo-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 32px;
          margin-top: 36px;
          align-items: start;
        }
        @media (max-width: 868px) {
          .demo-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }
        .demo-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 36px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
        }
        .demo-card-light {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 36px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.03);
        }
        .bd-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .bd-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .bd-row {
            grid-template-columns: 1fr;
          }
        }
        .bd-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.01em;
        }
        .bd-input, .bd-textarea {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          font-size: 0.92rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }
        .bd-input:focus, .bd-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
        }
        .bd-input::placeholder, .bd-textarea::placeholder {
          color: #94a3b8;
        }
        .contact-item-light {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          text-decoration: none;
          color: #0f172a;
          transition: all 0.2s ease;
          margin-bottom: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .contact-item-light:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
        }
        .contact-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .contact-text-label-light {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .contact-text-val-light {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }
        .benefit-pill-light {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          color: #475569;
          margin-bottom: 10px;
          font-weight: 500;
        }
      `}</style>

      <section className="demo-section">
        <div className="sec-head reveal" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ margin: '0 auto 12px' }}>Book a Demo</div>
          <h2 className="landing-h2">Tell us about your school.</h2>
          <p className="sec-p" style={{ maxWidth: 640, margin: '12px auto 0' }}>
            No self-signup — we set every school up personally. Request a demo below or get in touch with our onboarding team in Nairobi directly.
          </p>
        </div>

        <div className="demo-grid">
          {/* Left Side: Form */}
          <div className="demo-card reveal">
            {done ? (
              <div style={{ textAlign: 'center', padding: '36px 12px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: '#dcfce7',
                  color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <CheckIcon size={32} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: 10 }}>Request Received!</h3>
                <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 440, margin: '0 auto 24px' }}>
                  Thank you! We reach out to every school personally. Expect a call or WhatsApp message from our team within 24 hours.
                </p>
                <Link to="/" className="btn-p" style={{ display: 'inline-flex', padding: '14px 28px' }}>
                  Return to Home
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>
                  Schedule Your Personalized Demo
                </h3>

                <div className="bd-group">
                  <label className="bd-label">School Name *</label>
                  <input
                    type="text"
                    className="bd-input"
                    value={form.schoolName}
                    onChange={update('schoolName')}
                    placeholder="e.g. Kaulani Academy"
                    required
                  />
                </div>

                <div className="bd-row">
                  <div className="bd-group">
                    <label className="bd-label">Your Name *</label>
                    <input
                      type="text"
                      className="bd-input"
                      value={form.contactName}
                      onChange={update('contactName')}
                      placeholder="Head Teacher / Bursar / Admin"
                      required
                    />
                  </div>
                  <div className="bd-group">
                    <label className="bd-label">Approx. Student Count</label>
                    <input
                      type="text"
                      className="bd-input"
                      value={form.studentCount}
                      onChange={update('studentCount')}
                      placeholder="e.g. 350"
                    />
                  </div>
                </div>

                <div className="bd-row">
                  <div className="bd-group">
                    <label className="bd-label">Email Address *</label>
                    <input
                      type="email"
                      className="bd-input"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="you@school.ac.ke"
                      required
                    />
                  </div>
                  <div className="bd-group">
                    <label className="bd-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="bd-input"
                      value={form.phone}
                      onChange={update('phone')}
                      placeholder="07XX XXX XXX"
                      required
                    />
                  </div>
                </div>

                <div className="bd-group">
                  <label className="bd-label">Anything specific you want to see? (Optional)</label>
                  <textarea
                    rows={3}
                    className="bd-textarea"
                    value={form.message}
                    onChange={update('message')}
                    placeholder="e.g. We mainly want to see M-Pesa fee tracking, CBC report cards, and NEMIS sync."
                  />
                </div>

                {error && (
                  <div style={{
                    padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 10, color: '#dc2626', fontSize: '0.85rem', marginBottom: 20
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-p"
                  disabled={submitting}
                  style={{
                    width: '100%', justifyContent: 'center', padding: '16px',
                    fontSize: '1rem', marginTop: 10
                  }}
                >
                  {submitting ? 'Submitting Request…' : 'Request a Demo →'}
                </button>
              </form>
            )}
          </div>

          {/* Right Side: Light Direct Contacts & Information */}
          <div className="demo-card-light reveal reveal-delay-1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SchoolIcon size={20} color="#4f46e5" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Reach Us Directly
              </h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: 24 }}>
              Want an immediate answer or prefer a quick phone call? Reach out to our Nairobi team anytime.
            </p>

            <a href="tel:+254712260057" className="contact-item-light">
              <div className="contact-icon" style={{ background: '#2563eb' }}>
                <PhoneIcon size={20} color="#ffffff" />
              </div>
              <div>
                <div className="contact-text-label-light">Direct Line / Call</div>
                <div className="contact-text-val-light">+254 712 260 057</div>
              </div>
            </a>

            <a href="https://wa.me/254712260057" target="_blank" rel="noopener noreferrer" className="contact-item-light">
              <div className="contact-icon" style={{ background: '#16a34a' }}>
                <MessageIcon size={20} color="#ffffff" />
              </div>
              <div>
                <div className="contact-text-label-light">WhatsApp Chat</div>
                <div className="contact-text-val-light">+254 712 260 057</div>
              </div>
            </a>

            <a href="mailto:shulesoft8@gmail.com" className="contact-item-light">
              <div className="contact-icon" style={{ background: '#4f46e5' }}>
                <RocketIcon size={20} color="#ffffff" />
              </div>
              <div>
                <div className="contact-text-label-light">Official Support Email</div>
                <div className="contact-text-val-light" style={{ fontSize: '0.9rem' }}>shulesoft8@gmail.com</div>
              </div>
            </a>

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
              <div className="contact-text-label-light" style={{ marginBottom: 12 }}>Why Schools Choose Termly</div>
              <div className="benefit-pill-light">
                <CheckIcon size={16} color="#16a34a" /> 100% CBC & 8-4-4 Compliant Reports
              </div>
              <div className="benefit-pill-light">
                <CheckIcon size={16} color="#16a34a" /> Automated M-Pesa Fee Reconciliation
              </div>
              <div className="benefit-pill-light">
                <CheckIcon size={16} color="#16a34a" /> Zero Upfront Setup Fees
              </div>
              <div className="benefit-pill-light">
                <CheckIcon size={16} color="#16a34a" /> Local Nairobi Support & Onsite Assistance
              </div>
            </div>
          </div>
        </div>
      </section>
    </PremiumLayout>
  );
}
