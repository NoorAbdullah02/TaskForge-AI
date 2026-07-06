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
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Reset Your Password - TaskForge AI</title>
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
      background-color: #dc2626;
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
      color: #fecaca;
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
    .code-container {
      background-color: #f8fafc;
      border: 1px dashed #fca5a5;
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 28px;
      text-align: center;
    }
    .code-label {
      color: #64748b;
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
      color: #dc2626;
      margin: 0;
      padding: 4px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #dc2626;
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 36px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
      margin: 8px 0;
    }
    .divider {
      border: 0;
      height: 1px;
      background-color: #e2e8f0;
      margin: 32px 0;
    }
    .security-notice {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    .security-text {
      color: #b91c1c;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
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
    .footer-link:hover {
      color: #dc2626;
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
              <p style="color: #475569; font-size: 14px; margin: 0 0 4px;">Best regards,</p>
              <p style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0;">TaskForge AI Security</p>
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
