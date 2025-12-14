import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const APP_NAME = process.env.APP_NAME || "Football Analytics";
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SALES_EMAIL = process.env.SALES_EMAIL || "sales@footballanalytics.com";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  // If no API key, log and return success (for development)
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] Would send email:", {
      to: options.to,
      subject: options.subject,
      // Don't log full HTML
    });
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("[Email] Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Email] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Email Templates

export async function sendWelcomeEmail(email: string, name?: string) {
  const welcomeUrl = `${APP_URL}/dashboard`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${APP_NAME}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #020617; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${APP_NAME}!</h1>
          </div>
          <div style="background-color: #1e293b; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi${name ? ` ${name}` : ""},
            </p>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for joining ${APP_NAME}! We're excited to help you analyze your team's performance with advanced analytics and insights.
            </p>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Get started by creating your first team, adding players, and analyzing matches.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${welcomeUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
            </div>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `Welcome to ${APP_NAME}!\n\nHi${name ? ` ${name}` : ""},\n\nThank you for joining ${APP_NAME}! We're excited to help you analyze your team's performance with advanced analytics and insights.\n\nGet started: ${welcomeUrl}\n\nIf you have any questions, feel free to reach out to our support team.`;

  return sendEmail({
    to: email,
    subject: `Welcome to ${APP_NAME}!`,
    html,
    text,
  });
}

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const verificationUrl = `${APP_URL}/auth/verify?token=${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #020617; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
          </div>
          <div style="background-color: #1e293b; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi${name ? ` ${name}` : ""},
            </p>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Please verify your email address by clicking the button below:
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${verificationUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email</a>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
            This link will expire in 24 hours.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `Verify Your Email\n\nHi${name ? ` ${name}` : ""},\n\nPlease verify your email address by clicking this link: ${verificationUrl}\n\nThis link will expire in 24 hours.`;

  return sendEmail({
    to: email,
    subject: `Verify Your Email - ${APP_NAME}`,
    html,
    text,
  });
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string) {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #020617; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
          </div>
          <div style="background-color: #1e293b; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi${name ? ` ${name}` : ""},
            </p>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              You requested to reset your password. Click the button below to create a new password:
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a>
            </p>
            <p style="color: #f87171; font-size: 14px; margin-top: 20px; text-align: center;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
            This link will expire in 1 hour.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `Reset Your Password\n\nHi${name ? ` ${name}` : ""},\n\nYou requested to reset your password. Click this link: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`;

  return sendEmail({
    to: email,
    subject: `Reset Your Password - ${APP_NAME}`,
    html,
    text,
  });
}

export async function sendPaymentReceiptEmail(email: string, amount: number, currency: string, invoiceId: string, name?: string) {
  const billingUrl = `${APP_URL}/billing`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #020617; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Receipt</h1>
          </div>
          <div style="background-color: #1e293b; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi${name ? ` ${name}` : ""},
            </p>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for your payment!
            </p>
            <div style="background-color: #0f172a; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Invoice ID</p>
              <p style="color: white; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">${invoiceId}</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Amount</p>
              <p style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0;">${currency} ${amount.toFixed(2)}</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${billingUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Invoice</a>
            </div>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
            You can view and download your invoices from your billing dashboard.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `Payment Receipt\n\nHi${name ? ` ${name}` : ""},\n\nThank you for your payment!\n\nInvoice ID: ${invoiceId}\nAmount: ${currency} ${amount.toFixed(2)}\n\nYou can view and download your invoices from your billing dashboard.`;

  return sendEmail({
    to: email,
    subject: `Payment Receipt - ${APP_NAME}`,
    html,
    text,
  });
}

export async function sendPaymentFailureEmail(email: string, reason: string, name?: string) {
  const billingUrl = `${APP_URL}/billing`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #020617; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Failed</h1>
          </div>
          <div style="background-color: #1e293b; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi${name ? ` ${name}` : ""},
            </p>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              We were unable to process your payment.
            </p>
            <div style="background-color: #7f1d1d; border-left: 4px solid #ef4444; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="color: #fca5a5; font-size: 14px; margin: 0;">
                <strong>Reason:</strong> ${reason}
              </p>
            </div>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Please update your payment method to continue using ${APP_NAME}.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${billingUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Update Payment Method</a>
            </div>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
            If you continue to experience issues, please contact our support team.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `Payment Failed\n\nHi${name ? ` ${name}` : ""},\n\nWe were unable to process your payment.\n\nReason: ${reason}\n\nPlease update your payment method to continue using ${APP_NAME}.\n\nVisit: ${billingUrl}\n\nIf you continue to experience issues, please contact our support team.`;

  return sendEmail({
    to: email,
    subject: `Payment Failed - ${APP_NAME}`,
    html,
    text,
  });
}

export async function sendSalesInquiryEmail(
  customerName: string,
  customerEmail: string,
  company?: string,
  phone?: string,
  message?: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Sales Inquiry - Elite Plan</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #020617; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Sales Inquiry</h1>
            <p style="color: #10b981; font-size: 16px; margin: 10px 0 0 0;">Elite Plan Interest</p>
          </div>
          <div style="background-color: #1e293b; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              A new customer has expressed interest in the <strong style="color: #10b981;">Elite Plan</strong>.
            </p>
            
            <div style="background-color: #0f172a; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #10b981; font-size: 18px; margin: 0 0 15px 0; border-bottom: 1px solid #334155; padding-bottom: 10px;">Customer Information</h2>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Name</p>
                <p style="color: white; font-size: 16px; font-weight: 600; margin: 0;">${customerName}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                <p style="color: white; font-size: 16px; margin: 0;">
                  <a href="mailto:${customerEmail}" style="color: #10b981; text-decoration: none;">${customerEmail}</a>
                </p>
              </div>
              
              ${company ? `
              <div style="margin-bottom: 15px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Company / Club</p>
                <p style="color: white; font-size: 16px; margin: 0;">${company}</p>
              </div>
              ` : ''}
              
              ${phone ? `
              <div style="margin-bottom: 15px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Phone</p>
                <p style="color: white; font-size: 16px; margin: 0;">
                  <a href="tel:${phone}" style="color: #10b981; text-decoration: none;">${phone}</a>
                </p>
              </div>
              ` : ''}
              
              ${message ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
              <a href="mailto:${customerEmail}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">Reply to Customer</a>
            </div>
          </div>
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
            This inquiry was submitted through the ${APP_NAME} platform.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `New Sales Inquiry - Elite Plan\n\nA new customer has expressed interest in the Elite Plan.\n\nCustomer Information:\nName: ${customerName}\nEmail: ${customerEmail}${company ? `\nCompany: ${company}` : ''}${phone ? `\nPhone: ${phone}` : ''}${message ? `\n\nMessage:\n${message}` : ''}\n\nReply to: ${customerEmail}`;

  return sendEmail({
    to: SALES_EMAIL,
    subject: `New Sales Inquiry - ${customerName} (Elite Plan)`,
    html,
    text,
  });
}
