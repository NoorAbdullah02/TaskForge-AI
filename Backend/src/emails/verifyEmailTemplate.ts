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
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Verify Your Email - TaskForge AI</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 560px;
      margin: 40px auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
    }
    .header {
      background-color: #2563eb;
      padding: 40px 32px;
      text-align: center;
    }
    .logo-glow {
      display: inline-block;
      width: 64px;
      height: 64px;
      line-height: 64px;
      border-radius: 18px;
      background-color: rgba(255, 255, 255, 0.15);
      font-size: 28px;
      margin-bottom: 16px;
      text-align: center;
    }
    .title {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand {
      color: #bfdbfe;
    }
    .content {
      padding: 40px 32px;
    }
    .greeting {
      color: #0f172a;
      font-size: 18px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .text {
      color: #475569;
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
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 18px 48px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.3px;
    }
    .cta-subtext {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 12px;
      margin-bottom: 0;
    }
    .code-container {
      background-color: #f8fafc;
      border: 1px dashed #93c5fd;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 28px;
      text-align: center;
    }
    .code-label {
      color: #64748b;
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
      color: #2563eb;
      margin: 0;
      padding: 4px 0;
    }
    .security-notice {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    .security-text {
      color: #b45309;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }
    .link-fallback {
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.5;
      margin: 16px 0 0;
      word-break: break-all;
    }
    .link-fallback a {
      color: #2563eb;
      text-decoration: underline;
    }
    .footer {
      background-color: #f8fafc;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }
    .footer-links {
      margin-top: 12px;
    }
    .footer-link {
      color: #64748b;
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
                <td style="height: 1px; background-color: #e2e8f0; width: 40%;"></td>
                <td style="text-align: center; padding: 0 16px;">
                  <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">or enter code manually</span>
                </td>
                <td style="height: 1px; background-color: #e2e8f0; width: 40%;"></td>
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
              <tr><td style="height: 1px; background-color: #e2e8f0;"></td></tr>
            </table>

            <!-- Signature -->
            <div style="margin-top: 28px;">
              <p style="color: #475569; font-size: 14px; margin: 0 0 4px;">Best regards,</p>
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0;">TaskForge AI Assistant</p>
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
