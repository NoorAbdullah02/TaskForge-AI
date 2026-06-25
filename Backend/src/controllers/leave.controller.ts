import type { Request, Response } from 'express';
import { LeaveService } from '../services/leave.service';

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

            const leaveId = parseInt(req.params.id, 10);
            if (isNaN(leaveId)) {
                return res.status(400).json({ message: 'Invalid leave request ID' });
            }

            const record = await LeaveService.updateLeaveStatus(leaveId, 'approved', user.id);
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

            const leaveId = parseInt(req.params.id, 10);
            if (isNaN(leaveId)) {
                return res.status(400).json({ message: 'Invalid leave request ID' });
            }

            const record = await LeaveService.updateLeaveStatus(leaveId, 'rejected', user.id);
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
