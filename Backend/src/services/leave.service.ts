import { db } from '../db/index';
import { eq, desc } from 'drizzle-orm';
import { leaveRequests, users } from '../db/schema';

export class LeaveService {
    // Apply for a new leave request
    static async applyLeave(userId: number, data: {
        leaveType: string;
        startDate: Date;
        endDate: Date;
        reason: string;
    }) {
        const [inserted] = await db.insert(leaveRequests).values({
            userId,
            leaveType: data.leaveType,
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        return inserted;
    }

    // Get leave history of a single user
    static async getLeaveHistory(userId: number) {
        // Query leave requests and join users as the approver
        return db.select({
            id: leaveRequests.id,
            userId: leaveRequests.userId,
            leaveType: leaveRequests.leaveType,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            reason: leaveRequests.reason,
            status: leaveRequests.status,
            approvedById: leaveRequests.approvedById,
            createdAt: leaveRequests.createdAt,
            updatedAt: leaveRequests.updatedAt,
            approverName: users.name
        })
        .from(leaveRequests)
        .leftJoin(users, eq(leaveRequests.approvedById, users.id))
        .where(eq(leaveRequests.userId, userId))
        .orderBy(desc(leaveRequests.createdAt));
    }

    // Get all leave requests system-wide (joined with requester profiles)
    static async getAllLeaveRequests() {
        return db.select({
            id: leaveRequests.id,
            userId: leaveRequests.userId,
            leaveType: leaveRequests.leaveType,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            reason: leaveRequests.reason,
            status: leaveRequests.status,
            approvedById: leaveRequests.approvedById,
            createdAt: leaveRequests.createdAt,
            updatedAt: leaveRequests.updatedAt,
            userName: users.name,
            userEmail: users.email
        })
        .from(leaveRequests)
        .innerJoin(users, eq(leaveRequests.userId, users.id))
        .orderBy(desc(leaveRequests.createdAt));
    }

    // Update leave request status (Approve or Reject)
    static async updateLeaveStatus(leaveId: number, status: 'approved' | 'rejected', approvedById: number) {
        const [updated] = await db.update(leaveRequests)
            .set({
                status,
                approvedById,
                updatedAt: new Date()
            })
            .where(eq(leaveRequests.id, leaveId))
            .returning();

        return updated;
    }
}
