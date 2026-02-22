import nodemailer from 'nodemailer';

let transporter = null;

function extractLink(text = '') {
  const match = String(text).match(/https?:\/\/[^\s]+/);
  return match ? match[0] : '';
}

function getDevLogger() {
  return {
    sendMail: async (opts) => {
      console.log('[Email (dev)] To:', opts.to);
      console.log('[Email (dev)] Subject:', opts.subject);
      console.log('[Email (dev)] Magic link:', extractLink(opts.text || ''));
      return { messageId: 'dev-' + Date.now() };
    },
  };
}

function getTransporter() {
  if (transporter) return transporter;
  const url = process.env.SMTP_URL;
  if (url) {
    transporter = nodemailer.createTransport(url);
    return transporter;
  }
  transporter = getDevLogger();
  return transporter;
}

async function sendWithResend(to, subject, text, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.SMTP_FROM || 'Issavie <no-reply@issavie.com>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed: ${response.status} ${body}`);
  }
  return true;
}

export async function sendMagicLink(to, link) {
  const subject = 'Sign in to ISSAVIE';
  const text = `Sign in to ISSAVIE:\n\n${link}\n\nThis link expires in 15 minutes.`;
  const html = `<p>Sign in to ISSAVIE:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`;

  try {
    const sent = await sendWithResend(to, subject, text, html);
    if (sent) return;
  } catch (error) {
    console.error('[Email] Resend API error:', error?.message || error);
  }

  const transport = getTransporter();
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'Issavie <no-reply@issavie.com>',
    to,
    subject,
    text,
    html,
  });
}
