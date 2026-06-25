import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let testAccount: nodemailer.TestAccount | null = null;

async function initTransporter() {
    if (transporter) return transporter;

    // create a test account from Ethereal for dev email previews
    testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    return transporter;
}

export const sendMail = async (to: string, subject: string, html: string) => {
    const tr = await initTransporter();

    const info = await tr.sendMail({
        from: `No Reply <${testAccount?.user || 'no-reply@example.com'}>`,
        to,
        subject,
        html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', previewUrl);

    return { info, previewUrl };
};

export default sendMail;
