import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    // Check if we're in development mode and should skip email sending
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_EMAILS === 'true') {
      console.log('📧 Email sending skipped in development mode');
      console.log('📧 Would send to:', to);
      console.log('📧 Subject:', subject);
      return;
    }

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cabinbooking.com', // Use verified sender from env
      subject,
      html
    };
    
    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
    
    // If it's a credits exceeded error, log it but don't crash the app
    if (error.response?.body?.errors?.[0]?.message?.includes('Maximum credits exceeded')) {
      console.error('⚠️  SendGrid credits exceeded. Email not sent.');
      return; // Don't throw error, just log it
    }
    
    throw new Error('Failed to send email');
  }
};

// OTP EMAIL DISABLED - Commented out for development
/*
export const sendOTPEmail = async (email, otpCode, firstName) => {
  const subject = 'Verify Your Account - Cabin Booking';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Cabin Booking, ${firstName}!</h2>
      <p>Thank you for registering. Use the OTP below to verify your account:</p>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
        <strong>${otpCode}</strong>
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't create an account with us, please ignore this email.</p>
    </div>
  `;
  
  return await sendEmail(email, subject, html);
};
*/

export const sendPasswordResetEmail = async (email, token, firstName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const subject = 'Password Reset Request - Cabin Booking';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hello ${firstName},</h2>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    </div>
  `;
  
  return await sendEmail(email, subject, html);
};

// WELCOME EMAIL DISABLED - Commented out for development
/*
export const sendWelcomeEmail = async (email, firstName) => {
  const subject = 'Welcome to Cabin Booking!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome aboard, ${firstName}!</h2>
      <p>Your account has been successfully verified. You can now start booking cabins.</p>
      <p>Explore our beautiful cabins and book your next getaway!</p>
      <p>Happy travels!</p>
    </div>
  `;
  
  return await sendEmail(email, subject, html);
};
*/