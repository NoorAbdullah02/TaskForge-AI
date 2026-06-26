export const getBaseTemplate = (title: string, preheader: string, contentHtml: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
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
      padding: 40px 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(31, 41, 55, 0.5);
    }
    .logo-glow {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
      border: 1px solid rgba(59, 130, 246, 0.4);
      font-size: 20px;
      margin-bottom: 12px;
      text-align: center;
      color: #3b82f6;
      font-weight: 800;
    }
    .title {
      margin: 0;
      color: #f3f4f6;
      font-size: 22px;
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
      padding: 32px;
    }
    .footer {
      background-color: rgba(17, 24, 39, 0.5);
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid rgba(31, 41, 55, 0.5);
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
      margin-bottom: 24px;
    }
    .card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .card-title {
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .info-label {
      color: #6b7280;
    }
    .info-value {
      color: #e5e7eb;
      font-weight: 500;
    }
    .cta-wrapper {
      text-align: center;
      margin-bottom: 12px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-blue {
      background-color: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
    }
    .badge-purple {
      background-color: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
    }
    .badge-green {
      background-color: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }
    .badge-red {
      background-color: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo-glow">TF</div>
      <h1 class="title">TaskForge <span class="brand">AI</span></h1>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} TaskForge AI. All rights reserved.<br>
        This email was sent because you are registered on TaskForge AI.
      </p>
      <div class="footer-links">
        <a href="#" class="footer-link">Notification Settings</a>
        <span style="color: #374151;">•</span>
        <a href="#" class="footer-link">Privacy Policy</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
