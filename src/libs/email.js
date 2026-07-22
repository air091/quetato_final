import emailjs from "@emailjs/nodejs";

export const sendPasswordResetEmail = async (email, resetUrl) => {
  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        reset_link: resetUrl,
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      },
    );

    console.log("Password reset email sent:", response.status);
    return response;
  } catch (error) {
    console.error("Error sending reset password email:", error);
    throw new Error("Failed to send reset password email");
  }
};

// Add this function to handle confirmation emails
export const sendResetConfirmationEmail = async (email) => {
  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_CONFIRMATION_TEMPLATE_ID ||
        process.env.EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        message: "Your password has been successfully reset.",
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      },
    );

    console.log("Reset confirmation email sent:", response.status);
    return response;
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    throw new Error("Failed to send reset confirmation email");
  }
};
