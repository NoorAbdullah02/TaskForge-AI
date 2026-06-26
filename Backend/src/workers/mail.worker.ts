import { Worker, Job } from 'bullmq';
import { db } from '../db';
import { emailLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendMail } from '../lib/send-email';
import { bullMqConnection } from '../lib/queue';
import { logger } from '../lib/logger';

interface MailJobData {
  emailLogId: number;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const mailWorker = new Worker<MailJobData>(
  'mail-queue',
  async (job: Job<MailJobData>) => {
    const { emailLogId, to, subject, html, text } = job.data;
    logger.info(`Processing mail job ${job.id} for log ${emailLogId} to ${to}`);
    
    try {
      const result = await sendMail(to, subject, html, text);
      
      // Update emailLogs entry
      await db.update(emailLogs)
        .set({
          status: 'sent',
          messageId: result.messageId || null,
          sentAt: new Date(),
        })
        .where(eq(emailLogs.id, emailLogId));
        
      logger.info(`Mail job ${job.id} successfully completed and logged`);
      return result;
    } catch (err: any) {
      logger.error(`Mail job ${job.id} failed: ${err.message || JSON.stringify(err)}`);
      
      // Increment retryCount and save errorMessage
      const log = await db.select().from(emailLogs).where(eq(emailLogs.id, emailLogId)).limit(1);
      const currentRetryCount = log[0]?.retryCount || 0;
      
      await db.update(emailLogs)
        .set({
          status: 'failed',
          retryCount: currentRetryCount + 1,
          errorMessage: err.message || (typeof err === 'string' ? err : JSON.stringify(err)),
        })
        .where(eq(emailLogs.id, emailLogId));
        
      throw err; // Throw to trigger BullMQ retry backoff
    }
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  }
);

mailWorker.on('completed', (job) => {
  logger.info(`Mail job ${job.id} has completed!`);
});

mailWorker.on('failed', (job, err) => {
  logger.error(`Mail job ${job?.id} failed with ${err.message}`);
});
