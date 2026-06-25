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
  <title>Email Verification</title>
</head>
<body style="margin:0; padding:0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:16px; padding:0; box-shadow:0 20px 60px rgba(0,0,0,0.3); max-width:560px; overflow:hidden;">
          
          <!-- Decorative Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:40px 32px; text-align:center;">
              <div style="
                width:80px;
                height:80px;
                margin:0 auto 20px;
                background:rgba(255,255,255,0.2);
                border-radius:50%;
                display:flex;
                align-items:center;
                justify-content:center;
                backdrop-filter: blur(10px);
              ">
                <span style="font-size:40px;">✉️</span>
              </div>
              <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;">
                Verify Your Email
              </h1>
              <p style="margin:12px 0 0; color:rgba(255,255,255,0.9); font-size:16px;">
                You're almost there!
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 24px; color:#374151; font-size:16px; line-height:1.6;">
                Hi there 👋
              </p>
              <p style="margin:0 0 32px; color:#6b7280; font-size:15px; line-height:1.6;">
                Thanks for signing up! We're excited to have you on board. Please verify your email address to complete your registration.
              </p>

              <!-- Token Section -->
              <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius:12px; padding:24px; margin-bottom:32px; border:2px dashed #d1d5db;">
                <p style="margin:0 0 12px; color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
                  Your Verification Code
                </p>
                <p style="
                  margin:0;
                  font-family: 'Courier New', Consolas, monospace;
                  font-size:32px;
                  font-weight:700;
                  letter-spacing:4px;
                  color:#111827;
                  text-align:center;
                  user-select:all;
                  padding:12px 0;
                ">
                  ${token}
                </p>
                <p style="margin:12px 0 0; color:#9ca3af; font-size:12px; text-align:center;">
                  Click to select and copy
                </p>
              </div>

              <!-- Divider with text -->
              <div style="display:flex; align-items:center; margin:32px 0; text-align:center;">
                <div style="flex:1; height:1px; background:#e5e7eb;"></div>
                <span style="padding:0 16px; color:#9ca3af; font-size:13px; font-weight:500;">OR USE THE BUTTON</span>
                <div style="flex:1; height:1px; background:#e5e7eb;"></div>
              </div>

              <!-- Verification Button -->
              <div style="text-align:center; margin:32px 0;">
                <a href="${verifyEmailLink}"
                  style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color:#ffffff;
                    text-decoration:none;
                    padding:16px 48px;
                    border-radius:50px;
                    font-weight:600;
                    font-size:16px;
                    display:inline-block;
                    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
                    transition: all 0.3s ease;
                  ">
                  Verify Email Address
                </a>
              </div>

              <!-- Link Section -->
              <details style="margin:32px 0 0;">
                <summary style="
                  color:#6b7280;
                  font-size:14px;
                  cursor:pointer;
                  margin-bottom:12px;
                  user-select:none;
                  font-weight:500;
                ">
                  🔗 Or copy the verification link
                </summary>
                <div style="
                  background:#f9fafb;
                  padding:16px;
                  border-radius:8px;
                  border:1px solid #e5e7eb;
                  margin-top:12px;
                ">
                  <p style="
                    margin:0;
                    font-size:12px;
                    word-break:break-all;
                    color:#4b5563;
                    line-height:1.6;
                  ">
                    ${verifyEmailLink}
                  </p>
                </div>
              </details>

              <!-- Security Notice -->
              <div style="
                margin-top:40px;
                padding-top:24px;
                border-top:1px solid #e5e7eb;
              ">
                <p style="margin:0 0 12px; color:#9ca3af; font-size:13px; line-height:1.6;">
                  🔒 <strong style="color:#6b7280;">Security tip:</strong> This link expires in 24 hours.
                </p>
                <p style="margin:0; color:#9ca3af; font-size:13px; line-height:1.6;">
                  If you didn't create an account, please ignore this email.
                </p>
              </div>

              <!-- Signature -->
              <div style="margin-top:32px;">
                <p style="margin:0 0 4px; color:#374151; font-size:15px;">
                  Best regards,
                </p>
                <p style="margin:0; color:#111827; font-size:15px; font-weight:600;">
                  The Team
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb; padding:24px 32px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px; font-size:12px; color:#9ca3af;">
                © ${new Date().getFullYear()} Your Company. All rights reserved.
              </p>
              <p style="margin:0; font-size:11px; color:#d1d5db;">
                123 Your Street, Your City, Your Country
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};