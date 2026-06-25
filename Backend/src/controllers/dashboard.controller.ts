import type { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
    static async getStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const stats = await DashboardService.getStats(user.id);
            return res.status(200).json(stats);
        } catch (error) {
            console.error('Error in DashboardController.getStats:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
