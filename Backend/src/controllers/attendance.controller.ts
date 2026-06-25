import type { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { EmailTriggerService } from '../services/emailTrigger.service';

export class AttendanceController {
    // Get today's check-in/out status
    static async getTodayStatus(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
            const record = await AttendanceService.getTodayAttendance(user.id, dateStr);
            
            return res.status(200).json(record);
        } catch (error) {
            console.error('Error in getTodayStatus:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Check In user for today
    static async checkIn(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { date, location } = req.body;
            if (!date) {
                return res.status(400).json({ message: 'Date string YYYY-MM-DD is required' });
            }

            const ipAddress = (req as any).clientIp || req.ip;

            const record = await AttendanceService.checkIn(user.id, date, location, ipAddress);

            if (record.status === 'late' && user.activeWorkspaceId) {
                await EmailTriggerService.sendAttendanceWarning(
                    user.email,
                    user.name,
                    record.date,
                    'Late Check-in Warning',
                    user.activeWorkspaceId
                );
            }

            return res.status(201).json({
                message: 'Checked in successfully',
                record
            });
        } catch (error: any) {
            console.error('Error in checkIn controller:', error);
            return res.status(400).json({ message: error.message || 'Check-in failed' });
        }
    }

    // Check Out user for today
    static async checkOut(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { date } = req.body;
            if (!date) {
                return res.status(400).json({ message: 'Date string YYYY-MM-DD is required' });
            }

            const record = await AttendanceService.checkOut(user.id, date);
            return res.status(200).json({
                message: 'Checked out successfully',
                record
            });
        } catch (error: any) {
            console.error('Error in checkOut controller:', error);
            return res.status(400).json({ message: error.message || 'Check-out failed' });
        }
    }

    // Get all past attendance history
    static async getHistory(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const history = await AttendanceService.getAttendanceHistory(user.id);
            return res.status(200).json(history);
        } catch (error) {
            console.error('Error in getHistory controller:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get Monthly Attendance Report
    static async getMonthlyReport(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const year = parseInt(req.query.year as string, 10);
            const month = parseInt(req.query.month as string, 10);

            if (isNaN(year) || isNaN(month)) {
                return res.status(400).json({ message: 'Valid Year and Month query params are required' });
            }

            const report = await AttendanceService.getMonthlyReport(user.id, year, month);
            return res.status(200).json(report);
        } catch (error) {
            console.error('Error in getMonthlyReport controller:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Generate QR Attendance Token
    static async generateQR(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const token = await AttendanceService.generateQRToken(user.id);
            return res.status(200).json({ token });
        } catch (error) {
            console.error('Error in generateQR:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Verify QR Attendance Scan
    static async verifyQR(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { token, location } = req.body;
            if (!token) {
                return res.status(400).json({ message: 'Token is required' });
            }

            const ipAddress = (req as any).clientIp || req.ip;

            const record = await AttendanceService.verifyQRToken(token, location, ipAddress);
            return res.status(200).json({
                message: 'QR Attendance verified successfully',
                record
            });
        } catch (error: any) {
            console.error('Error in verifyQR:', error);
            return res.status(400).json({ message: error.message || 'QR verification failed' });
        }
    }
}
