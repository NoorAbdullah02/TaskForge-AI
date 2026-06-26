import cron from 'node-cron';
import { automationQueue } from '../lib/queue';
import { logger } from '../lib/logger';

export class AutomationScheduler {
  static init() {
    logger.info('⏰ Initializing Automation Scheduler...');

    // 1. Daily Summary at 07:00
    cron.schedule('0 7 * * *', async () => {
      logger.info('Scheduling dailySummary job...');
      await automationQueue.add('dailySummary', {});
    });

    // 2. Weekly Report at Mon 08:00
    cron.schedule('0 8 * * 1', async () => {
      logger.info('Scheduling weeklyReport job...');
      await automationQueue.add('weeklyReport', {});
    });

    // 3. Monthly Report on 1st at 08:00
    cron.schedule('0 8 1 * *', async () => {
      logger.info('Scheduling monthlyReport job...');
      await automationQueue.add('monthlyReport', {});
    });

    // 4. Task Reminder at 08:00 & 14:00
    cron.schedule('0 8,14 * * *', async () => {
      logger.info('Scheduling taskReminder job...');
      await automationQueue.add('taskReminder', {});
    });

    // 5. Deadline Alert at 09:00
    cron.schedule('0 9 * * *', async () => {
      logger.info('Scheduling deadlineAlert job...');
      await automationQueue.add('deadlineAlert', {});
    });

    // 6. Attendance Reminder at 09:05
    cron.schedule('5 9 * * *', async () => {
      logger.info('Scheduling attendanceReminder job...');
      await automationQueue.add('attendanceReminder', {});
    });

    // 7. Birthday Wishes at 08:00
    cron.schedule('0 8 * * *', async () => {
      logger.info('Scheduling birthdayWishes job...');
      await automationQueue.add('birthdayWishes', {});
    });

    // 8. Project Anniversary at 08:00
    cron.schedule('0 8 * * *', async () => {
      logger.info('Scheduling projectAnniversary job...');
      await automationQueue.add('projectAnniversary', {});
    });

    // 9. Leave Expiry Reminder at Mon 10:00
    cron.schedule('0 10 * * 1', async () => {
      logger.info('Scheduling leaveExpiryReminder job...');
      await automationQueue.add('leaveExpiryReminder', {});
    });

    // 10. Workspace Inactivity Reminder at 06:00
    cron.schedule('0 6 * * *', async () => {
      logger.info('Scheduling workspaceReminder job...');
      await automationQueue.add('workspaceReminder', {});
    });

    logger.info('⏰ Automation Scheduler initialized successfully');
  }
}
export default AutomationScheduler;
