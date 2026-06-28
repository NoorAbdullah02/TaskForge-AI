import type { Request, Response } from 'express';
import { LeaveService } from '../services/leave.service';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { db } from '../db/index';
import { users, leaveRequests, workspaces } from '../db/schema';
import { eq } from 'drizzle-orm';
import { NotificationService } from '../services/notification.service';

export class LeaveController {
    // Apply for leave request
    static async applyLeave(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { leaveType, startDate, endDate, reason } = req.body;
            
            if (!leaveType || !startDate || !endDate || !reason) {
                return res.status(400).json({ message: 'leaveType, startDate, endDate, and reason are required' });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ message: 'Invalid start or end dates provided' });
            }

            if (start > end) {
                return res.status(400).json({ message: 'Start date cannot be after end date' });
            }

            const record = await LeaveService.applyLeave(user.id, {
                leaveType,
                startDate: start,
                endDate: end,
                reason: reason.trim()
            });

            // Notify applicant about new leave request submission
            if (user.activeWorkspaceId) {
                await NotificationService.dispatch({
                    event: 'leave.request',
                    userId: user.id,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'leave',
                    entityId: record.id,
                    title: `Leave Request Submitted`,
                    message: `Your ${leaveType} leave request from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} has been submitted.`,
                    link: `/leaves`,
                    skipEmail: true,
                });

                // Find the workspace owner and notify them
                const wsList = await db
                    .select()
                    .from(workspaces)
                    .where(eq(workspaces.id, user.activeWorkspaceId))
                    .limit(1);
                if (wsList.length > 0 && wsList[0].ownerId) {
                    const ownerId = wsList[0].ownerId;
                    if (ownerId !== user.id) {
                        await NotificationService.dispatch({
                            event: 'leave.request',
                            userId: ownerId,
                            workspaceId: user.activeWorkspaceId,
                            entityType: 'leave',
                            entityId: record.id,
                            title: `New Leave Request from ${user.name}`,
                            message: `${user.name} has requested a ${leaveType} leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`,
                            link: `/leaves`,
                            emailTemplate: 'leaveRequest',
                            emailData: {
                                employeeName: user.name,
                                leaveType,
                                startDate: start.toLocaleDateString(),
                                endDate: end.toLocaleDateString(),
                                reason: reason.trim(),
                                link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/leaves`,
                            },
                        });
                    }
                }
            }

            return res.status(201).json({
                message: 'Leave application submitted successfully',
                record
            });
        } catch (error: any) {
            console.error('Error in applyLeave controller:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get log history of the requesting user
    static async getHistory(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const history = await LeaveService.getLeaveHistory(user.id);
            return res.status(200).json(history);
        } catch (error) {
            console.error('Error in getHistory controller:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get all system requests (Manager View)
    static async getRequests(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const requests = await LeaveService.getAllLeaveRequests();
            return res.status(200).json(requests);
        } catch (error) {
            console.error('Error in getRequests controller:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Approve a leave request
    static async approveLeave(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            // Enforce owner role restriction for approval
            if (user.role !== 'owner') {
                return res.status(403).json({ message: 'Forbidden: Only the workspace owner can approve leave requests' });
            }

            const leaveId = parseInt(req.params.id, 10);
            if (isNaN(leaveId)) {
                return res.status(400).json({ message: 'Invalid leave request ID' });
            }

            const record = await LeaveService.updateLeaveStatus(leaveId, 'approved', user.id);

            // Get applicant name for owner confirmation message
            const applicant = await db
                .select()
                .from(users)
                .where(eq(users.id, record.userId))
                .limit(1)
                .then((res) => res[0]);
            const applicantName = applicant ? applicant.name : 'Employee';

            // Send unified notification to the applicant via NotificationService
            if (user.activeWorkspaceId) {
                await NotificationService.dispatch({
                    event: 'leave.approved',
                    userId: record.userId,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'leave',
                    entityId: leaveId,
                    title: 'Leave Request Approved ✅',
                    message: `Your ${record.leaveType} leave from ${record.startDate.toLocaleDateString()} to ${record.endDate.toLocaleDateString()} has been approved.`,
                    link: '/leaves',
                    emailTemplate: 'leaveApproved',
                    emailData: {
                        leaveType: record.leaveType,
                        startDate: record.startDate.toLocaleDateString(),
                        endDate: record.endDate.toLocaleDateString(),
                        approvedBy: user.name,
                        link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/leaves`,
                    },
                });

                // Send a confirmation notification to the owner
                await NotificationService.dispatch({
                    event: 'leave.approved_owner',
                    userId: user.id,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'leave',
                    entityId: leaveId,
                    title: 'Leave Request Approved',
                    message: `You approved ${record.leaveType} leave for ${applicantName} from ${record.startDate.toLocaleDateString()} to ${record.endDate.toLocaleDateString()}.`,
                    link: '/leaves',
                    skipEmail: true,
                });
            }

            return res.status(200).json({
                message: 'Leave request approved successfully',
                record
            });
        } catch (error: any) {
            console.error('Error in approveLeave controller:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Reject a leave request
    static async rejectLeave(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            // Enforce owner role restriction for rejection
            if (user.role !== 'owner') {
                return res.status(403).json({ message: 'Forbidden: Only the workspace owner can reject leave requests' });
            }

            const leaveId = parseInt(req.params.id, 10);
            if (isNaN(leaveId)) {
                return res.status(400).json({ message: 'Invalid leave request ID' });
            }

            const record = await LeaveService.updateLeaveStatus(leaveId, 'rejected', user.id);

            // Get applicant name for owner confirmation message
            const applicant = await db
                .select()
                .from(users)
                .where(eq(users.id, record.userId))
                .limit(1)
                .then((res) => res[0]);
            const applicantName = applicant ? applicant.name : 'Employee';

            // Send unified notification to the applicant via NotificationService
            if (user.activeWorkspaceId) {
                await NotificationService.dispatch({
                    event: 'leave.rejected',
                    userId: record.userId,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'leave',
                    entityId: leaveId,
                    title: 'Leave Request Rejected',
                    message: `Your ${record.leaveType} leave from ${record.startDate.toLocaleDateString()} to ${record.endDate.toLocaleDateString()} was not approved.`,
                    link: '/leaves',
                    emailTemplate: 'leaveRejected',
                    emailData: {
                        leaveType: record.leaveType,
                        startDate: record.startDate.toLocaleDateString(),
                        endDate: record.endDate.toLocaleDateString(),
                        rejectedBy: user.name,
                        reason: null,
                        link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/leaves`,
                    },
                });

                // Send a confirmation notification to the owner
                await NotificationService.dispatch({
                    event: 'leave.rejected_owner',
                    userId: user.id,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'leave',
                    entityId: leaveId,
                    title: 'Leave Request Rejected',
                    message: `You rejected ${record.leaveType} leave for ${applicantName} from ${record.startDate.toLocaleDateString()} to ${record.endDate.toLocaleDateString()}.`,
                    link: '/leaves',
                    skipEmail: true,
                });
            }

            return res.status(200).json({
                message: 'Leave request rejected successfully',
                record
            });
        } catch (error: any) {
            console.error('Error in rejectLeave controller:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
