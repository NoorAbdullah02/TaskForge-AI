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
  <title>Your OTP Verification Code - TaskForge AI</title>
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
      background: linear-gradient(180deg, rgba(139, 92, 246, 0.15) 0%, rgba(0, 0, 0, 0) 100%);
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
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
      border: 1px solid rgba(139, 92, 246, 0.4);
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
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      color: #8b5cf6;
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
      border: 1px dashed rgba(139, 92, 246, 0.3);
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
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #a78bfa;
      margin: 0;
    }
    .warning {
      color: #ef4444;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 28px;
    }
    .footer {
      background-color: #070a13;
      padding: 32px;
      text-align: center;
      border-top: 1px solid rgba(31, 41, 55, 0.5);
    }
    .footer-text {
      color: #4b5563;
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
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">Two-Factor Authentication (2FA)</p>
    </div>
    <div class="content">
      <h2 class="greeting">Hello,</h2>
      <p class="text">We received a request to log in to your <span class="brand">TaskForge AI</span> account. Please use the following verification code to complete your sign-in process.</p>
      
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
