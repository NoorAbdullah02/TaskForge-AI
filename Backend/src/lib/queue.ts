import { Queue } from 'bullmq';
import { env } from '../config/env';
import { logger } from './logger';

export const MAIL_QUEUE_NAME = 'mail-queue';
export const BACKGROUND_JOB_QUEUE_NAME = 'background-job-queue';


export const redisUrl = new URL(env.REDIS_URL);
export const bullMqConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1)) || 0 : 0,
  maxRetriesPerRequest: null, // Required by BullMQ
};

export const mailQueue = new Queue(MAIL_QUEUE_NAME, {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const notificationQueue = new Queue('notification-queue', {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const automationQueue = new Queue('automation-queue', {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const backgroundJobQueue = new Queue(BACKGROUND_JOB_QUEUE_NAME, {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

logger.info('BullMQ Queues initialized successfully');
