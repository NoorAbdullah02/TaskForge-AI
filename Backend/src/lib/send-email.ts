import axios from "axios";
import { env } from "../config/env";

const BREVO_API_KEY = env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const FROM_EMAIL = env.EMAIL_FROM;
const FROM_NAME = env.EMAIL_FROM_NAME;

// Small helper to create a plain-text version of HTML content
const stripHtmlTags = (input: string) => input.replace(/<[^>]*>/g, '');


export const sendMail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
) => {
  try {
    // Validate email
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid email address: ${to}`);
    }

    const payload = {
      sender: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      to: [
        {
          email: to.toLowerCase().trim(),
          name: to.split('@')[0], // Use part before @ as default name
        },
      ],
      subject: subject.trim(),
      htmlContent: html,
      textContent: text || stripHtmlTags(html), // Plain text version for better delivery
      replyTo: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      // Important: Add headers to improve deliverability
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Brevo",
      },
    };

    console.log(`📧 Sending email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Email sent successfully to ${to} (status: ${response.status})`);
    console.log("Brevo response:", response.data);

    const result = {
      success: true,
      messageId: response.data.messageId,
      previewUrl: response.data.previewUrl ?? null,
      email: to,
      timestamp: new Date().toISOString(),
      raw: response.data,
    };

    return result;
  } catch (error: any) {
    console.error("❌ Error sending email via Brevo:");
    console.error("URL:", BREVO_API_URL);
    console.error("To:", to);
    console.error("Error Response:", error.response?.data ?? error.message);
    console.error("Error Status:", error.response?.status);

    // Return detailed error info
    const errorDetails = {
      success: false,
      error: error.response?.data?.message || error.message,
      statusCode: error.response?.status,
      details: error.response?.data,
    };

    throw errorDetails;
  }
};