export const getBaseTemplate = (title: string, preheader: string, contentHtml: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
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
      background-color: #4f46e5;
      padding: 32px;
      text-align: center;
    }
    .logo-glow {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      border-radius: 12px;
      background-color: rgba(255, 255, 255, 0.15);
      font-size: 20px;
      margin-bottom: 12px;
      text-align: center;
      color: #ffffff;
      font-weight: 800;
    }
    .title {
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand {
      color: #c7d2fe;
    }
    .content {
      padding: 32px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
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
      color: #4f46e5;
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
      margin-bottom: 24px;
    }
    .card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .card-title {
      color: #0f172a;
      font-size: 16px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .info-row {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .info-label {
      display: table-cell;
      color: #64748b;
      text-align: left;
    }
    .info-value {
      display: table-cell;
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .cta-wrapper {
      text-align: center;
      margin-bottom: 12px;
    }
    .cta-button {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
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
      background-color: #eff6ff;
      color: #1d4ed8;
    }
    .badge-purple {
      background-color: #f5f3ff;
      color: #6d28d9;
    }
    .badge-green {
      background-color: #ecfdf5;
      color: #047857;
    }
    .badge-red {
      background-color: #fef2f2;
      color: #b91c1c;
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
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
        <span style="color: #cbd5e1;">•</span>
        <a href="#" class="footer-link">Privacy Policy</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
