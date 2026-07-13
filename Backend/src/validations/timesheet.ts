import { z } from 'zod';

export const GenerateTimesheetSchema = z.object({
  body: z.object({
    periodType: z.enum(['daily', 'weekly', 'monthly']),
    periodStart: z.string().trim().min(1, 'Period start date is required'),
  }),
});

export const SubmitTimesheetSchema = z.object({
  body: z.object({}).optional(),
});

export const ReviewTimesheetSchema = z.object({
  body: z.object({
    note: z.string().trim().optional().nullable(),
  }),
});
