import { z } from 'zod';

export const SubmitPaymentSchema = z.object({
  body: z.object({
    plan: z.enum(['pro', 'enterprise']),
    billingCycle: z.enum(['monthly', 'yearly']),
    method: z.enum(['bkash', 'nagad']),
    transactionId: z.string().trim().min(3, 'Transaction ID is required'),
    senderNumber: z.string().trim().min(6, 'Sender number is required'),
    screenshotUrl: z.string().trim().url().optional().nullable(),
  }),
});

export const RejectPaymentSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3, 'Rejection reason is required'),
  }),
});
