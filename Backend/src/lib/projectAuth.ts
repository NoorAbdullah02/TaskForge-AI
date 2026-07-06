import { db } from '../db/index';
import { projectMembers } from '../db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Checks if a user has manager/owner access to a project.
 * Workspace Owners/Admins bypass this and always return true.
 */
export async function isProjectManager(userId: number, userWorkspaceRole: string, projectId: number): Promise<boolean> {
    if (userWorkspaceRole === 'owner' || userWorkspaceRole === 'admin' || userWorkspaceRole === 'super_admin') {
        return true;
    }
    const [membership] = await db.select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
        ));
    if (!membership) return false;
    return membership.role === 'manager' || membership.role === 'project_manager' || membership.role === 'owner';
}

/**
 * Checks if a user is a member of a project.
 * Workspace Owners/Admins bypass this and always return true.
 */
export async function isProjectMember(userId: number, userWorkspaceRole: string, projectId: number): Promise<boolean> {
    if (userWorkspaceRole === 'owner' || userWorkspaceRole === 'admin' || userWorkspaceRole === 'super_admin') {
        return true;
    }
    const [membership] = await db.select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
        ));
    return !!membership;
}
