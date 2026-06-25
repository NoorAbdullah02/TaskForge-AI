import { db } from '../db/index';
import { users, departments, teams, activityLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';

async function logActivity(userId: number | null, action: string, entityType: string, entityId: number | null, details: string, ip: string | null) {
    try {
        await db.insert(activityLogs).values({
            userId,
            action,
            entityType,
            entityId,
            details,
            ipAddress: ip ? ip.substring(0, 50) : null
        });
    } catch (err) {
        console.error('Failed to log team activity:', err);
    }
}

export const getTeams = async (req: Request, res: Response) => {
    try {
        const list = await db.select().from(teams);
        const allUsers = await db.select().from(users);
        const depts = await db.select().from(departments);

        const result = list.map(t => {
            const leader = allUsers.find(u => u.id === t.leaderId);
            const dept = depts.find(d => d.id === t.departmentId);
            const memberCount = allUsers.filter(u => u.teamId === t.id).length;

            return {
                id: t.id,
                name: t.name,
                description: t.description,
                leaderId: t.leaderId,
                leader: leader ? { id: leader.id, name: leader.name, email: leader.email } : null,
                departmentId: t.departmentId,
                departmentName: dept ? dept.name : 'Not Assigned',
                memberCount,
                createdAt: t.createdAt
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in getTeams:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const createTeam = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { name, description, leaderId, departmentId } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Team name is required" });
        }

        const [existing] = await db.select().from(teams).where(eq(teams.name, name.trim()));
        if (existing) {
            return res.status(400).json({ message: "Team name already exists" });
        }

        const [created] = await db.insert(teams).values({
            name: name.trim(),
            description: description || null,
            leaderId: leaderId ? parseInt(leaderId, 10) : null,
            departmentId: departmentId ? parseInt(departmentId, 10) : null
        }).returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'CREATE', 'team', created.id, `Created team ${created.name}`, ip);

        return res.status(201).json(created);
    } catch (error) {
        console.error("Error in createTeam:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateTeam = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid team ID" });

        const [team] = await db.select().from(teams).where(eq(teams.id, id));
        if (!team) return res.status(404).json({ message: "Team not found" });

        const { name, description, leaderId, departmentId } = req.body;
        if (name && name.trim().length === 0) {
            return res.status(400).json({ message: "Team name cannot be empty" });
        }

        if (name && name.trim() !== team.name) {
            const [existing] = await db.select().from(teams).where(eq(teams.name, name.trim()));
            if (existing) {
                return res.status(400).json({ message: "Team name already exists" });
            }
        }

        const [updated] = await db.update(teams)
            .set({
                name: name !== undefined ? name.trim() : team.name,
                description: description !== undefined ? description : team.description,
                leaderId: leaderId !== undefined ? (leaderId ? parseInt(leaderId, 10) : null) : team.leaderId,
                departmentId: departmentId !== undefined ? (departmentId ? parseInt(departmentId, 10) : null) : team.departmentId,
                updatedAt: new Date()
            })
            .where(eq(teams.id, id))
            .returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'team', id, `Updated team ${updated.name}`, ip);

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Error in updateTeam:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid team ID" });

        const [team] = await db.select().from(teams).where(eq(teams.id, id));
        if (!team) return res.status(404).json({ message: "Team not found" });

        // Dissolve user team associations
        await db.update(users).set({ teamId: null }).where(eq(users.teamId, id));

        await db.delete(teams).where(eq(teams.id, id));

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'DELETE', 'team', id, `Deleted team ${team.name}`, ip);

        return res.status(200).json({ message: "Team deleted successfully" });
    } catch (error) {
        console.error("Error in deleteTeam:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getTeamMembers = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid team ID" });

        const members = await db.select().from(users).where(eq(users.teamId, id));
        const safeMembers = members.map(({ password, otpCode, otpExpiresAt, ...u }) => u);

        return res.status(200).json(safeMembers);
    } catch (error) {
        console.error("Error in getTeamMembers:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const addTeamMember = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const teamId = parseInt(req.params.id, 10);
        const { userId } = req.body;

        if (isNaN(teamId) || !userId) {
            return res.status(400).json({ message: "Team ID and User ID are required" });
        }

        const [targetUser] = await db.select().from(users).where(eq(users.id, parseInt(userId, 10)));
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
        if (!team) return res.status(404).json({ message: "Team not found" });

        await db.update(users).set({ teamId }).where(eq(users.id, targetUser.id));

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'user', targetUser.id, `Added user ${targetUser.name} to team ${team.name}`, ip);

        return res.status(200).json({ message: "Member added to team successfully" });
    } catch (error) {
        console.error("Error in addTeamMember:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const removeTeamMember = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const teamId = parseInt(req.params.id, 10);
        const { userId } = req.body;

        if (isNaN(teamId) || !userId) {
            return res.status(400).json({ message: "Team ID and User ID are required" });
        }

        const [targetUser] = await db.select().from(users).where(eq(users.id, parseInt(userId, 10)));
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        await db.update(users).set({ teamId: null }).where(eq(users.id, targetUser.id));

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'user', targetUser.id, `Removed user ${targetUser.name} from team`, ip);

        return res.status(200).json({ message: "Member removed from team successfully" });
    } catch (error) {
        console.error("Error in removeTeamMember:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
