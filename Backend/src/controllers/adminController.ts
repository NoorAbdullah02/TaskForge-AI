import { db } from '../db/index';
import { users, departments, systemSettings, activityLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';

async function logAdminAction(req: Request, action: string, entityType: string, entityId: number | null, details: string) {
    try {
        const user = (req as any).user;
        const ip = (req as any).clientIp || req.ip || req.headers['x-forwarded-for'] || null;
        await db.insert(activityLogs).values({
            userId: user ? user.id : null,
            action,
            entityType,
            entityId,
            details,
            ipAddress: typeof ip === 'string' ? ip.substring(0, 50) : null
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}

export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        const [settings] = await db.select().from(systemSettings).limit(1);
        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }
        return res.status(200).json(settings);
    } catch (error) {
        console.error("Error in getSystemSettings:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Admins only" });
        }

        const [settings] = await db.select().from(systemSettings).limit(1);
        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }

        const { orgName, orgLogo, timeZone, officeStart, officeEnd, workingDays, holidays, leavePolicy } = req.body;

        const updated = await db.update(systemSettings)
            .set({
                orgName: orgName !== undefined ? orgName : settings.orgName,
                orgLogo: orgLogo !== undefined ? orgLogo : settings.orgLogo,
                timeZone: timeZone !== undefined ? timeZone : settings.timeZone,
                officeStart: officeStart !== undefined ? officeStart : settings.officeStart,
                officeEnd: officeEnd !== undefined ? officeEnd : settings.officeEnd,
                workingDays: workingDays !== undefined ? workingDays : settings.workingDays,
                holidays: holidays !== undefined ? (typeof holidays === 'string' ? holidays : JSON.stringify(holidays)) : settings.holidays,
                leavePolicy: leavePolicy !== undefined ? (typeof leavePolicy === 'string' ? leavePolicy : JSON.stringify(leavePolicy)) : settings.leavePolicy,
                updatedAt: new Date()
            })
            .where(eq(systemSettings.id, settings.id))
            .returning();

        await logAdminAction(req, 'UPDATE', 'settings', settings.id, `Updated system settings for ${updated[0].orgName}`);

        return res.status(200).json(updated[0]);
    } catch (error) {
        console.error("Error in updateSystemSettings:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getAdminDepartments = async (req: Request, res: Response) => {
    try {
        const depts = await db.select().from(departments);
        const allUsers = await db.select().from(users);

        const list = depts.map(dept => {
            const mgr = allUsers.find(u => u.id === dept.managerId);
            const empCount = allUsers.filter(u => u.departmentId === dept.id).length;
            return {
                id: dept.id,
                name: dept.name,
                description: dept.description,
                managerId: dept.managerId,
                manager: mgr ? { id: mgr.id, name: mgr.name, email: mgr.email } : null,
                employeeCount: empCount,
                createdAt: dept.createdAt
            };
        });

        return res.status(200).json(list);
    } catch (error) {
        console.error("Error in getAdminDepartments:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Admins only" });
        }

        const { name, description, managerId } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Department name is required" });
        }

        const [existing] = await db.select().from(departments).where(eq(departments.name, name.trim()));
        if (existing) {
            return res.status(400).json({ message: "Department with this name already exists" });
        }

        const [created] = await db.insert(departments).values({
            name: name.trim(),
            description: description || null,
            managerId: managerId ? parseInt(managerId, 10) : null
        }).returning();

        await logAdminAction(req, 'CREATE', 'department', created.id, `Created department ${created.name}`);

        return res.status(201).json(created);
    } catch (error) {
        console.error("Error in createDepartment:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Admins only" });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid department ID" });

        const [dept] = await db.select().from(departments).where(eq(departments.id, id));
        if (!dept) return res.status(404).json({ message: "Department not found" });

        const { name, description, managerId } = req.body;
        if (name !== undefined && name.trim().length === 0) {
            return res.status(400).json({ message: "Department name cannot be empty" });
        }

        if (name && name.trim() !== dept.name) {
            const [existing] = await db.select().from(departments).where(eq(departments.name, name.trim()));
            if (existing) {
                return res.status(400).json({ message: "Department with this name already exists" });
            }
        }

        const [updated] = await db.update(departments)
            .set({
                name: name !== undefined ? name.trim() : dept.name,
                description: description !== undefined ? description : dept.description,
                managerId: managerId !== undefined ? (managerId ? parseInt(managerId, 10) : null) : dept.managerId,
                updatedAt: new Date()
            })
            .where(eq(departments.id, id))
            .returning();

        await logAdminAction(req, 'UPDATE', 'department', id, `Updated department ${updated.name}`);

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Error in updateDepartment:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Admins only" });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid department ID" });

        const [dept] = await db.select().from(departments).where(eq(departments.id, id));
        if (!dept) return res.status(404).json({ message: "Department not found" });

        // Update all users belonging to this department to null
        await db.update(users).set({ departmentId: null }).where(eq(users.departmentId, id));

        await db.delete(departments).where(eq(departments.id, id));

        await logAdminAction(req, 'DELETE', 'department', id, `Deleted department ${dept.name}`);

        return res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
        console.error("Error in deleteDepartment:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getAdminUsers = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const allUsers = await db.select().from(users);
        const depts = await db.select().from(departments);

        const list = allUsers.map(u => {
            const dept = depts.find(d => d.id === u.departmentId);
            const { password, otpCode, otpExpiresAt, ...safeUser } = u;
            return {
                ...safeUser,
                departmentName: dept ? dept.name : 'Not Assigned'
            };
        });

        return res.status(200).json(list);
    } catch (error) {
        console.error("Error in getAdminUsers:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateUserRoleDept = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Admins only" });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

        const [targetUser] = await db.select().from(users).where(eq(users.id, id));
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        const { role, departmentId, position, phone } = req.body;

        const [updated] = await db.update(users)
            .set({
                role: role !== undefined ? role : targetUser.role,
                departmentId: departmentId !== undefined ? (departmentId ? parseInt(departmentId, 10) : null) : targetUser.departmentId,
                position: position !== undefined ? position : targetUser.position,
                phone: phone !== undefined ? phone : targetUser.phone,
                updatedAt: new Date()
            })
            .where(eq(users.id, id))
            .returning();

        await logAdminAction(req, 'UPDATE', 'user', id, `Updated role/department for user ${updated.name} (Role: ${updated.role}, Dept: ${updated.departmentId})`);

        const { password, otpCode, otpExpiresAt, ...safeUser } = updated;
        return res.status(200).json(safeUser);
    } catch (error) {
        console.error("Error in updateUserRoleDept:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const logs = await db.select().from(activityLogs);
        const allUsers = await db.select().from(users);

        const list = logs.map(log => {
            const operator = allUsers.find(u => u.id === log.userId);
            return {
                id: log.id,
                userId: log.userId,
                operatorName: operator ? operator.name : 'System / Unknown',
                operatorEmail: operator ? operator.email : null,
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                details: log.details,
                ipAddress: log.ipAddress,
                createdAt: log.createdAt
            };
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return res.status(200).json(list);
    } catch (error) {
        console.error("Error in getAuditLogs:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
