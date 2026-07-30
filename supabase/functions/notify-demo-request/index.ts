import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPERADMIN_EMAIL = Deno.env.get('SUPERADMIN_EMAIL');

serve(async (req) => {
  try {
    const payload = await req.json();

    // Check if this is an INSERT into demo_requests
    if (payload.type !== 'INSERT' || payload.table !== 'demo_requests') {
      return new Response(JSON.stringify({ error: 'Ignored, not a new demo request' }), { status: 400 });
    }

    const { school_name, contact_name, phone, email, student_count, message } = payload.record;

    // 1. Send Telegram Notification
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const telegramText = `
🔔 *New Demo Request!*
🏫 *School:* ${school_name}
👤 *Contact:* ${contact_name}
📞 *Phone:* ${phone}
📧 *Email:* ${email}
👩‍🎓 *Students:* ${student_count || 'Not provided'}
💬 *Message:* ${message || 'None'}
      `;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramText,
          parse_mode: 'Markdown',
        }),
      }).catch(err => console.error("Telegram error:", err));
    }

    // 2. Send Email Notification via Resend
    if (RESEND_API_KEY && SUPERADMIN_EMAIL) {
      const htmlContent = `
        <h2>New Demo Request for Termly!</h2>
        <p><strong>School Name:</strong> ${school_name}</p>
        <p><strong>Contact Name:</strong> ${contact_name}</p>
        <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Approx. Students:</strong> ${student_count || 'Not provided'}</p>
        <p><strong>Message:</strong> ${message || 'None'}</p>
        <br/>
        <p>Log in to your SuperAdmin dashboard to review this request and contact the school.</p>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Termly Notifications <onboarding@resend.dev>',
          to: [SUPERADMIN_EMAIL],
          subject: `🔔 New Demo Request: ${school_name}`,
          html: htmlContent,
        }),
      }).catch(err => console.error("Resend error:", err));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
