import { sendEmail } from './sendgridMailer.js';

const formatDate = (d) => {
  try {
    const date = new Date(d);
    // Norwegian locale formatting
    return date.toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: '2-digit' });
  } catch {
    return String(d);
  }
};

const formatRange = (start, end) => `${formatDate(start)} – ${formatDate(end)}`;

export const sendWelcomeEmail = async (email, firstName) => {
  const subject = 'Velkommen til Cabin Booking!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background:#ffffff;">
      <div style="text-align:center; margin-bottom: 16px;">
        <img alt="Cabin Booking" src="${process.env.FRONTEND_URL || ''}/logo.png" style="height:40px; object-fit:contain;" />
      </div>
      <h2 style="color:#111827;">Velkommen, ${firstName}!</h2>
      <p style="color:#374151;">Kontoen din er bekreftet. Du kan nå administrere hytter og bestillinger.</p>
      ${process.env.FRONTEND_URL ? `<p style="margin: 20px 0;"><a href="${process.env.FRONTEND_URL}" style="background:#2563EB; color:#fff; padding:12px 16px; text-decoration:none; border-radius:6px;">Gå til Cabin Booking</a></p>` : ''}
      <p style="color:#6B7280; font-size:12px;">Hvis du har spørsmål, kontakt oss ved å svare på denne e-posten.</p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};

export const sendCabinCreatedEmail = async (email, ownerFirstName, cabin) => {
  const subject = `Hytte opprettet: ${cabin.name}`;
  const cabinUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/cabins/${cabin.slug}` : '';
  const addressLine = [cabin.address, cabin.postal_code, cabin.city].filter(Boolean).join(', ');
  const contactLine = [cabin.contact_person_name, cabin.phone].filter(Boolean).join(' · ');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background:#ffffff;">
      <div style="text-align:center; margin-bottom: 16px;">
        <img alt="Cabin Booking" src="${process.env.FRONTEND_URL || ''}/logo.png" style="height:40px; object-fit:contain;" />
      </div>
      <h2 style="color:#111827; margin:0 0 8px;">Hei ${ownerFirstName},</h2>
      <p style="color:#374151;">Hytta <strong>${cabin.name}</strong> er opprettet og klar for administrasjon.</p>

      <div style="border:1px solid #E5E7EB; border-radius:8px; padding:16px; margin:16px 0;">
        <h3 style="margin:0 0 8px; color:#111827;">Detaljer</h3>
        <p style="margin:4px 0; color:#374151;"><strong>Adresse:</strong> ${addressLine || '—'}</p>
        <p style="margin:4px 0; color:#374151;"><strong>Kontakt:</strong> ${contactLine || '—'}</p>
        <p style="margin:4px 0; color:#374151;"><strong>E-post:</strong> ${cabin.email || '—'}</p>
        <p style="margin:4px 0; color:#374151;"><strong>Halvdag:</strong> ${cabin.halfdayAvailability ? 'Aktivert' : 'Avslått'}</p>
      </div>

      ${cabinUrl ? `<p style="margin: 20px 0;"><a href="${cabinUrl}" style="background:#2563EB; color:#fff; padding:12px 16px; text-decoration:none; border-radius:6px;">Se hytta</a></p>` : ''}

      <div style="margin-top:16px;">
        <h3 style="margin:0 0 8px; color:#111827;">Neste steg</h3>
        <ul style="color:#374151; padding-left:18px; margin:0;">
          <li>Legg til tilgjengelighet og blokker datoer ved behov.</li>
          <li>Bekreft kontaktinformasjon og bilde for hytta.</li>
          <li>Del hyttelenken med gjester eller teamet ditt.</li>
        </ul>
      </div>

      <p style="color:#6B7280; font-size:12px; margin-top:16px;">Hvis du har spørsmål, svar på denne e-posten.</p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};

export const sendBookingCreatedOwnerEmail = async (email, cabinName, guestName, startDate, endDate, orderNo) => {
  const subject = `Ny bestilling forespørsel for ${cabinName}`;
  const range = formatRange(startDate, endDate);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Ny bestilling mottatt</h2>
      <p>Hytta: <strong>${cabinName}</strong></p>
      <p>Bestiller: <strong>${guestName || 'Ukjent'}</strong></p>
      <p>Datoer: <strong>${range}</strong></p>
      ${orderNo ? `<p>Ordrenr: <strong>${orderNo}</strong></p>` : ''}
    </div>
  `;
  return await sendEmail(email, subject, html);
};

export const sendBookingCreatedGuestEmail = async (email, guestName, cabinName, startDate, endDate, status = 'pending') => {
  const subject = `Bestillingsforespørsel for ${cabinName}`;
  const range = formatRange(startDate, endDate);
  const statusText = status === 'approved' ? 'godkjent' : status === 'rejected' ? 'avslått' : 'venter på godkjenning';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hei ${guestName || ''}</h2>
      <p>Vi har mottatt bestillingsforespørselen din for <strong>${cabinName}</strong>.</p>
      <p>Datoer: <strong>${range}</strong></p>
      <p>Status: <strong>${statusText}</strong></p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};

export const sendBookingStatusEmail = async (email, guestName, cabinName, startDate, endDate, status) => {
  const range = formatRange(startDate, endDate);
  let subject;
  if (status === 'approved') subject = `Bestilling godkjent for ${cabinName}`;
  else if (status === 'rejected') subject = `Bestilling avslått for ${cabinName}`;
  else if (status === 'cancelled') subject = `Bestilling kansellert for ${cabinName}`;
  else subject = `Oppdatering for bestilling (${cabinName})`;

  // Map status to Norwegian text for email body
  const statusText =
    status === 'approved' ? 'godkjent'
    : status === 'rejected' ? 'avslått'
    : status === 'cancelled' ? 'kansellert'
    : status === 'pending' ? 'venter på godkjenning'
    : String(status);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hei ${guestName || ''}</h2>
      <p>Status for bestillingen din for <strong>${cabinName}</strong> er oppdatert til <strong>${statusText}</strong>.</p>
      <p>Datoer: <strong>${range}</strong></p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};

export const sendLegendCreatedEmail = async (email, firstName, legendName) => {
  const subject = `Legend opprettet: ${legendName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hei ${firstName},</h2>
      <p>Du har opprettet en ny legend: <strong>${legendName}</strong>.</p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};

export const sendOTPEmail = async (email, otpCode, firstName) => {
  const subject = 'Bekreft kontoen din – engangskode (OTP)';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background:#ffffff;">
      <div style="text-align:center; margin-bottom: 16px;">
        <img alt="Cabin Booking" src="${process.env.FRONTEND_URL || ''}/logo.png" style="height:40px; object-fit:contain;" />
      </div>
      <h2 style="color:#111827;">Hei ${firstName},</h2>
      <p style="color:#374151;">Bruk engangskoden nedenfor for å bekrefte kontoen din. Koden er gyldig i 10 minutter.</p>
      <div style="background:#F3F4F6; padding: 16px; text-align:center; font-size:28px; letter-spacing:6px; border-radius:8px; margin:20px 0; color:#111827;">
        <strong>${otpCode}</strong>
      </div>
      <p style="color:#374151;">Hvis du ikke ba om dette, kan du ignorere denne e-posten.</p>
      <p style="color:#6B7280; font-size:12px;">Trenger du ny kode? Du kan be om ny OTP fra innloggingssiden.</p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};