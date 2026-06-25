import { db } from '../db/index';
import { eq, and, desc, like } from 'drizzle-orm';
import { attendance } from '../db/schema';

export class AttendanceService {
    // Get today's attendance record for a user
    static async getTodayAttendance(userId: number, dateStr: string) {
        const [record] = await db.select()
            .from(attendance)
            .where(and(eq(attendance.userId, userId), eq(attendance.date, dateStr)));
        return record || null;
    }

    // Check-in user
    static async checkIn(userId: number, dateStr: string, location?: string, ipAddress?: string) {
        // Check if already checked in today
        const existing = await this.getTodayAttendance(userId, dateStr);
        if (existing) {
            throw new Error('Already checked in today');
        }

        const checkInTime = new Date();
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        
        // Late if checked in after 9:30 AM
        const isLate = hours > 9 || (hours === 9 && minutes > 30);
        const status = isLate ? 'late' : 'present';

        const [inserted] = await db.insert(attendance).values({
            userId,
            date: dateStr,
            checkIn: checkInTime,
            status,
            location: location || null,
            ipAddress: ipAddress || null
        }).returning();

        return inserted;
    }

    // Check-out user
    static async checkOut(userId: number, dateStr: string) {
        const existing = await this.getTodayAttendance(userId, dateStr);
        if (!existing) {
            throw new Error("You haven't checked in yet today");
        }
        if (existing.checkOut) {
            throw new Error('Already checked out today');
        }

        const [updated] = await db.update(attendance)
            .set({ checkOut: new Date() })
            .where(and(eq(attendance.userId, userId), eq(attendance.date, dateStr)))
            .returning();

        return updated;
    }

    // Get user's full attendance history
    static async getAttendanceHistory(userId: number) {
        return db.select()
            .from(attendance)
            .where(eq(attendance.userId, userId))
            .orderBy(desc(attendance.date));
    }

    // Generate monthly report and stats
    static async getMonthlyReport(userId: number, year: number, month: number) {
        const monthStr = String(month).padStart(2, '0');
        const monthPattern = `${year}-${monthStr}%`;

        const records = await db.select()
            .from(attendance)
            .where(and(eq(attendance.userId, userId), like(attendance.date, monthPattern)))
            .orderBy(desc(attendance.date));

        let totalHours = 0;
        let checkInsCount = 0;
        let totalCheckInMinutes = 0;

        records.forEach((r) => {
            if (r.checkIn) {
                checkInsCount++;
                const checkInDate = new Date(r.checkIn);
                totalCheckInMinutes += checkInDate.getHours() * 60 + checkInDate.getMinutes();

                if (r.checkOut) {
                    const diffMs = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
                    totalHours += diffMs / (1000 * 60 * 60);
                }
            }
        });

        const avgCheckInTime = checkInsCount > 0
            ? `${String(Math.floor(totalCheckInMinutes / checkInsCount / 60)).padStart(2, '0')}:${String(Math.floor((totalCheckInMinutes / checkInsCount) % 60)).padStart(2, '0')}`
            : 'N/A';

        return {
            records,
            stats: {
                totalDays: records.length,
                presentCount: records.filter((r) => r.status === 'present').length,
                lateCount: records.filter((r) => r.status === 'late').length,
                totalHours: parseFloat(totalHours.toFixed(2)),
                avgCheckInTime
            }
        };
    }
}
