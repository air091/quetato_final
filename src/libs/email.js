import "dotenv/config";
import nodemailer from "nodemailer";

// Lazy-create transporter when needed
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT, 10) || 465,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Make sure App Password is used for Gmail
      },
      connectionTimeout: 8000, // 8 seconds max to connect
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });
  }
  return transporter;
}

export const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    const transporterInstance = getTransporter();
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${username || "User"},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0; border: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
        </div>
      `,
      text: `Password Reset Request\n\nHello ${username || "User"},\n\nWe received a request to reset your password. Use the following link to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    };

    await transporterInstance.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error.message);
  }
};

export const sendResetConfirmationEmail = async (email, username) => {
  try {
    const transporterInstance = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Password Reset Successful",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Successful</h2>
          <p>Hello ${username || "User"},</p>
          <p>Your password has been successfully reset. If you didn't perform this action, please contact support immediately.</p>
          <p>You can now log in with your new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login" 
               style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Log In
            </a>
          </div>
          <hr style="margin: 20px 0; border: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
        </div>
      `,
      text: `Password Reset Successful\n\nHello ${username || "User"},\n\nYour password has been successfully reset. If you didn't perform this action, please contact support immediately.\n\nYou can now log in with your new password.`,
    };

    await transporterInstance.sendMail(mailOptions);
    console.log(`✅ Password reset confirmation sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send confirmation to ${email}:`, error.message);
  }
};
