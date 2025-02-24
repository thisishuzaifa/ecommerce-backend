import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL!;

sgMail.setApiKey(SENDGRID_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    text: text || "",
    html: html || "",
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export const emailTemplates = {
  welcomeEmail: (name: string) => ({
    subject: "Welcome to Our Store!",
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for creating an account with us. We're excited to have you!</p>
      <p>Start shopping now to discover our amazing products.</p>
    `,
  }),

  orderConfirmation: (orderNumber: string, total: number) => ({
    subject: `Order Confirmation #${orderNumber}`,
    html: `
      <h1>Order Confirmation</h1>
      <p>Thank you for your order #${orderNumber}!</p>
      <p>Your total: $${total.toFixed(2)}</p>
      <p>We'll notify you when your order ships.</p>
    `,
  }),

  passwordReset: (resetToken: string) => ({
    subject: "Password Reset Request",
    html: `
      <h1>Reset Your Password</h1>
      <p>You requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">
        Reset Password
      </a>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  }),
};
