import cron from 'node-cron';
import { logger } from '../lib/logger';

export class AutomationScheduler {
  static init() {
    logger.info('⏰ Automation Scheduler is disabled because Redis and BullMQ support have been removed.');
  }
}
export default AutomationScheduler;
