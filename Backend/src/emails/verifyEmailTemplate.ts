type VerifyEmailTemplateProps = {
    verifyEmailLink: string;
    token: string;
};

export const verifyEmailTemplate = ({
    verifyEmailLink,
    token,
}: VerifyEmailTemplateProps): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email - TaskForge AI</title>
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
      background: linear-gradient(180deg, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0) 100%);
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
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
      border: 1px solid rgba(59, 130, 246, 0.4);
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
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      color: #3b82f6;
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
    .cta-wrapper {
      text-align: center;
      margin-bottom: 32px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 18px 48px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.3px;
      box-shadow: 0 10px 30px -5px rgba(59, 130, 246, 0.5);
    }
    .cta-subtext {
      color: #6b7280;
      font-size: 13px;
      margin-top: 12px;
      margin-bottom: 0;
    }
    .divider-container {
      display: flex;
      align-items: center;
      margin: 28px 0;
    }
    .divider-line {
      flex: 1;
      height: 1px;
      background-color: #1f2937;
    }
    .divider-text {
      color: #4b5563;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 0 16px;
    }
    .code-container {
      background: #111827;
      border: 1px dashed rgba(59, 130, 246, 0.3);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 28px;
      text-align: center;
    }
    .code-label {
      color: #6b7280;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .code-value {
      font-family: 'Courier New', Courier, monospace;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #60a5fa;
      margin: 0;
      padding: 4px 0;
    }
    .security-notice {
      background-color: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    .security-text {
      color: #f59e0b;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }
    .link-fallback {
      color: #4b5563;
      font-size: 12px;
      line-height: 1.5;
      margin: 16px 0 0;
      word-break: break-all;
    }
    .link-fallback a {
      color: #60a5fa;
      text-decoration: underline;
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
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <div class="email-container">
          
          <!-- Header -->
          <div class="header">
            <div class="logo-glow">🤖</div>
            <h1 class="title">Verify with <span class="brand">TaskForge AI</span></h1>
          </div>

          <!-- Content -->
          <div class="content">
            <p class="greeting">Welcome to the team!</p>
            <p class="text">
              Thank you for choosing TaskForge AI. We're thrilled to help you automate, optimize, and streamline your workflow. Click the button below to verify your email address and activate your account.
            </p>

            <!-- Primary CTA Button -->
            <div class="cta-wrapper">
              <a href="${verifyEmailLink}" class="cta-button">✅ Verify My Email Address</a>
              <p class="cta-subtext">Just click the button — no code needed!</p>
            </div>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="height: 1px; background-color: #1f2937; width: 40%;"></td>
                <td style="text-align: center; padding: 0 16px;">
                  <span style="color: #4b5563; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">or enter code manually</span>
                </td>
                <td style="height: 1px; background-color: #1f2937; width: 40%;"></td>
              </tr>
            </table>

            <!-- Verification Code (secondary) -->
            <div class="code-container" style="margin-top: 28px;">
              <p class="code-label">Verification Code</p>
              <p class="code-value">${token}</p>
            </div>

            <div class="security-notice">
              <p class="security-text">
                🔒 <strong>Security Notice:</strong> This verification link and code will expire in 24 hours. If you did not register for a TaskForge AI account, please ignore this email.
              </p>
            </div>

            <!-- Link fallback -->
            <p class="link-fallback">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${verifyEmailLink}">${verifyEmailLink}</a>
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
              <tr><td style="height: 1px; background-color: #1f2937;"></td></tr>
            </table>

            <!-- Signature -->
            <div style="margin-top: 28px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 4px;">Best regards,</p>
              <p style="color: #f3f4f6; font-size: 15px; font-weight: 700; margin: 0;">TaskForge AI Assistant</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              © ${new Date().getFullYear()} TaskForge AI. All rights reserved.
            </p>
            <p class="footer-text" style="margin-top: 4px;">
              Empowering project efficiency through autonomous workflows.
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