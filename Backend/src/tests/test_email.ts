import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { sendMail } from '../lib/send-email';

async function testEmail() {
    console.log('📬 Initializing SMTP verification check...');
    console.log(`From Email: ${process.env.EMAIL_FROM}`);
    console.log(`Sender Name: ${process.env.EMAIL_FROM_NAME}`);

    try {
        const result = await sendMail(
            'sheikhnoorabdullah02@gmail.com',
            'TaskForge AI - Email Verification Check',
            `
            <div style="font-family: sans-serif; background-color: #0f172a; padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); max-width: 500px; margin: 0 auto; color: #f8fafc;">
                <h1 style="color: #3b82f6; font-size: 20px; font-weight: 800; margin-bottom: 16px;">TaskForge AI SMTP Status Check</h1>
                <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">This is a test email sent from the automated SMTP checker to verify your Brevo integration credentials.</p>
                <div style="margin-top: 24px; padding: 12px; background-color: rgba(59,130,246,0.1); border-left: 4px solid #3b82f6; border-radius: 4px; font-size: 12px; font-weight: 600; color: #60a5fa;">
                    Status: SMTP Service is operational
                </div>
            </div>
            `
        );

        console.log('✅ Email service is fully functional!');
        console.log('Result details:', result);
        process.exit(0);
    } catch (error) {
        console.error('❌ Email service failed:', error);
        process.exit(1);
    }
}

testEmail();
