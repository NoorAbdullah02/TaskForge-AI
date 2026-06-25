type PasswordResetTemplateProps = {
    resetUrl: string;
    token: string;
};

export const passwordResetTemplate = ({
    resetUrl,
    token,
}: PasswordResetTemplateProps): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password - TaskForge AI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #030712;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 540px;
      margin: 40px auto;
      background-color: #0b0f19;
      border: 1px solid #1f2937;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
      padding: 48px 32px 32px;
      text-align: center;
      border-bottom: 1px solid rgba(31, 41, 55, 0.5);
    }
    .logo-glow {
      display: inline-block;
      width: 64px;
      height: 64px;
      line-height: 64px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
      border: 1px solid rgba(239, 68, 68, 0.4);
      font-size: 28px;
      margin-bottom: 20px;
      text-align: center;
    }
    .title {
      margin: 0;
      color: #f3f4f6;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand {
      background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      color: #ef4444;
    }
    .content {
      padding: 40px 32px;
    }
    .greeting {
      color: #f3f4f6;
      font-size: 18px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .text {
      color: #9ca3af;
      font-size: 15px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 28px;
    }
    .code-container {
      background: #111827;
      border: 1px dashed rgba(239, 68, 68, 0.3);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 28px;
      text-align: center;
    }
    .code-label {
      color: #6b7280;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .code-value {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #fca5a5;
      margin: 0;
      padding: 4px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 36px;
      border-radius: 14px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 10px 20px -5px rgba(239, 68, 68, 0.4);
      margin: 8px 0;
    }
    .divider {
      border: 0;
      height: 1px;
      background-color: #1f2937;
      margin: 32px 0;
    }
    .security-notice {
      background-color: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    .security-text {
      color: #f87171;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }
    .footer {
      background-color: #080c14;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #1f2937;
    }
    .footer-text {
      color: #4b5563;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }
    .footer-links {
      margin-top: 12px;
    }
    .footer-link {
      color: #6b7280;
      text-decoration: none;
      font-size: 12px;
      margin: 0 8px;
    }
    .footer-link:hover {
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <div class="email-container">
          
          <!-- Header -->
          <div class="header">
            <div class="logo-glow">🔒</div>
            <h1 class="title">Reset <span class="brand">Password</span></h1>
          </div>

          <!-- Content -->
          <div class="content">
            <p class="greeting">Password Reset Request</p>
            <p class="text">
              We received a request to reset your password. Use the authorization code below or click the button to continue with the password recovery process.
            </p>

            <!-- Verification Code -->
            <div class="code-container">
              <p class="code-label">Reset Authorization Code</p>
              <p class="code-value">${token}</p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetUrl}" class="cta-button">Reset Your Password</a>
            </div>

            <div class="security-notice">
              <p class="security-text">
                ⚠️ <strong>Security Notice:</strong> If you did not make this request, you can safely ignore this email. Your current password remains secure, and the reset link will automatically expire in 15 minutes.
              </p>
            </div>

            <div class="divider"></div>

            <!-- Signature -->
            <div>
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 4px;">Best regards,</p>
              <p style="color: #f3f4f6; font-size: 15px; font-weight: 700; margin: 0;">TaskForge AI Security</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              © ${new Date().getFullYear()} TaskForge AI. All rights reserved.
            </p>
            <div class="footer-links">
              <a href="#" class="footer-link">Privacy Policy</a>
              <a href="#" class="footer-link">Terms of Service</a>
              <a href="#" class="footer-link">Support</a>
            </div>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};
