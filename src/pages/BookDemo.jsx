// src/pages/BookDemo.jsx
//
// Replaces self-serve /register as the landing page's primary CTA.
// Captures a lead into demo_requests (public INSERT, no login
// needed — see 20260725_demo_requests_and_school_registration.sql)
// instead of creating an account directly. You register the school
// yourself afterward from SuperAdmin, once you've actually talked
// to them.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PremiumLayout from '../components/PremiumLayout';
import { supabase } from '../lib/supabase';

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

      <section className="section" style={{ maxWidth: 640, margin: '0 auto' }}>
        {done ? (
          <div className="sec-head reveal" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="eyebrow">Request received</div>
            <h2 className="landing-h2">We'll be in touch shortly.</h2>
            <p className="sec-p">
              We reach out to every school personally — expect a call or WhatsApp message
              from us within a couple of days to set up your demo.
            </p>
            <Link to="/" className="btn-p" style={{ marginTop: 24, display: 'inline-flex' }}>Back to home</Link>
          </div>
        ) : (
          <>
            <div className="sec-head reveal">
              <div className="eyebrow">Book a demo</div>
              <h2 className="landing-h2">Tell us about your school.</h2>
              <p className="sec-p">
                No self-signup — we set every school up personally, so tell us a bit about
                yours and we'll reach out to arrange a short demo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="sb-lbl">School name *</label>
                <input type="text" value={form.schoolName} onChange={update('schoolName')} placeholder="e.g. Kaulani Academy" required />
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label className="sb-lbl">Your name *</label>
                  <input type="text" value={form.contactName} onChange={update('contactName')} placeholder="Head teacher / bursar / admin" required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="sb-lbl">Approx. student count</label>
                  <input type="text" value={form.studentCount} onChange={update('studentCount')} placeholder="e.g. 350" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label className="sb-lbl">Email *</label>
                  <input type="email" value={form.email} onChange={update('email')} placeholder="you@school.ac.ke" required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="sb-lbl">Phone *</label>
                  <input type="tel" value={form.phone} onChange={update('phone')} placeholder="07XX XXX XXX" required />
                </div>
              </div>
              <div>
                <label className="sb-lbl">Anything specific you want to see? (optional)</label>
                <textarea rows={3} value={form.message} onChange={update('message')} placeholder="e.g. we mainly want to see fee tracking and M-Pesa reconciliation" />
              </div>

              {error && <div style={{ color: 'var(--danger, #ef4444)', fontSize: '.85rem' }}>{error}</div>}

              <button type="submit" className="btn-p" disabled={submitting} style={{ justifyContent: 'center' }}>
                {submitting ? 'Sending…' : 'Request a demo'}
              </button>
            </form>
          </>
        )}
      </section>
    </PremiumLayout>
  );
}
