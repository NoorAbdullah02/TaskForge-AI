type OtpTemplateProps = {
    token: string;
};

export const otpTemplate = ({
    token,
}: OtpTemplateProps): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Your OTP Verification Code - TaskForge AI</title>
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
      background-color: #7c3aed;
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
      color: #ddd6fe;
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
      border: 1px dashed #c4b5fd;
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
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #7c3aed;
      margin: 0;
    }
    .warning {
      color: #dc2626;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 28px;
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
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo-glow">🔒</div>
      <h1 class="title">Verify Your Login</h1>
      <p style="color: #ddd6fe; font-size: 14px; margin: 8px 0 0 0;">Two-Factor Authentication (2FA)</p>
    </div>
    <div class="content">
      <h2 class="greeting">Hello,</h2>
      <p class="text">We received a request to log in to your <span style="color: #7c3aed; font-weight: 600;">TaskForge AI</span> account. Please use the following verification code to complete your sign-in process.</p>

      <div class="code-container">
        <h3 class="code-label">Verification Code</h3>
        <p class="code-value">${token}</p>
      </div>

      <p class="warning">⚠️ This code is only valid for 5 minutes. Do not share this code with anyone.</p>

      <p class="text" style="margin-bottom: 0;">If you did not request this login, please change your account password immediately to secure your workspace.</p>
    </div>
    <div class="footer">
      <p class="footer-text">This is an automated security message from TaskForge AI.<br />Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
    `;
};
