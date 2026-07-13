import { z } from 'zod';

export const SubmitWorkLogSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, 'Title is required').max(255),
    taskId: z.union([z.number(), z.string(), z.null()]).optional(),
    projectId: z.union([z.number(), z.string(), z.null()]).optional(),
    logDate: z.string().trim().min(1, 'Date is required'),
    startTime: z.string().trim().optional().nullable(),
    endTime: z.string().trim().optional().nullable(),
    hoursWorked: z.coerce.number().min(0, 'Hours worked cannot be negative').max(24, 'Hours worked cannot exceed 24'),
    progressPercent: z.coerce.number().int().min(0).max(100).optional(),
    description: z.string().trim().min(3, 'Description is required'),
    challenges: z.string().trim().optional().nullable(),
    tomorrowPlan: z.string().trim().optional().nullable(),
    gitCommitUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
    attachments: z.array(z.object({
      fileName: z.string(),
      fileUrl: z.string().url(),
      fileSize: z.number().optional().nullable(),
      fileType: z.string().optional().nullable(),
    })).optional(),
  }),
});

export const UpdateWorkLogSchema = SubmitWorkLogSchema;

export const ReviewWorkLogSchema = z.object({
  body: z.object({
    note: z.string().trim().optional().nullable(),
  }),
});

export const BulkApproveWorkLogSchema = z.object({
  body: z.object({
    workLogIds: z.array(z.coerce.number()).min(1, 'Select at least one work log'),
  }),
});
