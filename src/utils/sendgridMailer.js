import sgMail from '@sendgrid/mail';

let initialized = false;

const resolveApiKey = () => {
  const key = (process.env.SENDGRID_API_KEY || process.env.SendGrid_API_KEY || '').trim();
  if (!key) throw new Error('Missing SENDGRID_API_KEY environment variable');
  return key;
};

const ensureInitialized = () => {
  if (initialized) return;
  const apiKey = resolveApiKey();
  sgMail.setApiKey(apiKey);
  initialized = true;
};

export const sendEmail = async (to, subject, html) => {
  if (!to) throw new Error('Recipient email (to) is required');
  if (!subject) throw new Error('Email subject is required');
  if (!html) throw new Error('Email HTML content is required');

  // Skip emails in dev if requested
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_EMAILS === 'true') {
    console.log('📧 Email sending skipped (dev)');
    console.log('📧 Would send to:', to);
    console.log('📧 Subject:', subject);
    return { skipped: true };
  }

  const from = (process.env.SENDGRID_FROM_EMAIL || '').trim();
  if (!from) throw new Error('Missing SENDGRID_FROM_EMAIL environment variable');

  try {
    ensureInitialized();
    const msg = { to, from, subject, html };
    const [res] = await sgMail.send(msg);
    console.log('Email sent:', res?.headers ? res.headers['x-message-id'] || res.headers['x-sendgrid-message-id'] : 'ok');
    return res;
  } catch (error) {
    const code = error?.code || error?.response?.statusCode;
    const bodyErrors = error?.response?.body?.errors || [];
    const firstErr = bodyErrors[0]?.message || error?.message;

    if (code === 401) {
      console.error('SendGrid 401 Unauthorized:', firstErr);
      throw new Error('Unauthorized: Check SENDGRID_API_KEY value and permissions');
    }
    if (code === 403) {
      console.error('SendGrid 403 Forbidden:', firstErr);
      console.error('Ensure the sender is verified in SendGrid and API key has Mail Send permission');
      throw new Error('Forbidden: Verify sender identity and API key permissions');
    }

    console.error('SendGrid send error:', firstErr || error);
    throw new Error('Failed to send email');
  }
};