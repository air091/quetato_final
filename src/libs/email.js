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

    console.log(
      "Email sent successfully via EmailJS:",
      response.status,
      response.text,
    );
    return response;
  } catch (error) {
    console.error("Error sending reset password email via EmailJS:", error);
    throw new Error("Failed to send reset password email");
  }
};
