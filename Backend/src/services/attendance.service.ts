import { db } from '../db/index';
import { eq, and, desc, like } from 'drizzle-orm';
import { attendance, users, systemSettings } from '../db/schema';

// Helper to encode base64
function encodeBase64(str: string): string {
    return Buffer.from(str).toString('base64');
}

// Helper to decode base64
function decodeBase64(str: string): string {
    return Buffer.from(str, 'base64').toString('ascii');
}

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

        const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
        const shift = userRecord?.shiftType || 'morning';

        const checkInTime = new Date();
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        const checkInMinutes = hours * 60 + minutes;

        let graceMinutes = 9 * 60 + 30; // Default morning shift late after 09:30 AM
        
        if (shift === 'evening') {
            graceMinutes = 17 * 60 + 30; // Evening shift late after 05:30 PM
        } else if (shift === 'custom') {
            try {
                const [settings] = await db.select().from(systemSettings).limit(1);
                if (settings && settings.officeStart) {
                    const [startHour, startMin] = settings.officeStart.split(':').map(Number);
                    graceMinutes = startHour * 60 + startMin + 30; // Office start + 30 min grace
                }
            } catch (err) {
                console.error('Failed to load system settings for shift check:', err);
            }
        }

        const isLate = checkInMinutes > graceMinutes;
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

    // Generate secure QR Checkin token
    static async generateQRToken(userId: number) {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTimeMinutes = hour * 60 + minute;
        const startMinutes = 11 * 60; // 11:00 AM
        const endMinutes = 20 * 60; // 8:00 PM
        
        if (currentTimeMinutes < startMinutes || currentTimeMinutes > endMinutes) {
            throw new Error('QR code generation is disabled outside 11:00 AM - 08:00 PM');
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const timestamp = Date.now();
        // Create token: "userId:dateStr:timestamp"
        const plainText = `${userId}:${dateStr}:${timestamp}`;
        return encodeBase64(plainText);
    }

    // Verify QR Checkin token and execute check-in
    static async verifyQRToken(token: string, location?: string, ipAddress?: string) {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTimeMinutes = hour * 60 + minute;
        const startMinutes = 11 * 60; // 11:00 AM
        const endMinutes = 20 * 60; // 8:00 PM
        
        if (currentTimeMinutes < startMinutes || currentTimeMinutes > endMinutes) {
            throw new Error('QR check-in verification is disabled outside 11:00 AM - 08:00 PM');
        }

        try {
            const decoded = decodeBase64(token);
            const [tokenUserIdStr, dateStr, timestampStr] = decoded.split(':');
            const tokenUserId = parseInt(tokenUserIdStr, 10);
            const timestamp = parseInt(timestampStr, 10);

            if (isNaN(tokenUserId) || isNaN(timestamp) || !dateStr) {
                throw new Error('Invalid QR Code format');
            }

            // Expiry check: 5 minutes (300,000 milliseconds)
            if (Date.now() - timestamp > 300000) {
                throw new Error('QR Code has expired');
            }

            // Perform check-in
            return await this.checkIn(tokenUserId, dateStr, location || 'QR Scanner', ipAddress);
        } catch (error: any) {
            throw new Error(error.message || 'QR Verification failed');
        }
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
