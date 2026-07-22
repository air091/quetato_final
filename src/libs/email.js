import "dotenv/config";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || "https://quetato-sport.vercel.app"}/reset-password?token=${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev", // Use this while testing or add your verified domain
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
        </div>
      `,
    });

    if (error) {
      console.error(`❌ Resend Error:`, error);
      return false;
    }

    console.log(`✅ Password reset email sent via Resend to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error.message);
    return false;
  }
};

export const sendResetConfirmationEmail = async (email, username) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Password Reset Successful",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Successful</h2>
          <p>Hello ${username || "User"},</p>
          <p>Your password has been successfully reset.</p>
        </div>
      `,
    });

    if (error) {
      console.error(`❌ Resend Error:`, error);
      return false;
    }

    console.log(`✅ Confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send confirmation to ${email}:`, error.message);
    return false;
  }
};
