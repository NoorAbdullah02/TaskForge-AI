import { Request, Response } from 'express';
import { db } from '../db/index';
import { workspaces, workspaceMembers, users, activityLogs, projects, projectMembers, notifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as queries from '../db/queries';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { socketService } from '../services/socket.service';
import { env } from '../config/env';
import { NotificationService } from '../services/notification.service';

// Utility to generate random invite code TF-XXXXXX
function generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TF-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export class WorkspaceController {
    // Option 1: Create New Workspace
    static async createWorkspace(req: Request, res: Response) {
        try {
            const { name, email, password, workspaceName, workspaceSlug } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Name, email, and password are required' });
            }

            // Check if user already exists
            let user = await queries.getUserByEmail(email);
            if (user) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            // Determine whether this is the first user in the system
            const allUsers = await db.select().from(users).limit(1);
            const isFirstUser = allUsers.length === 0;

            if (!isFirstUser && (!workspaceName || !workspaceSlug)) {
                return res.status(400).json({ message: 'Workspace name and slug are required for non-super-admin registration' });
            }

            // Check if slug is taken when workspace details are provided
            if (!isFirstUser) {
                const [existingWorkspace] = await db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug.toLowerCase()));
                if (existingWorkspace) {
                    return res.status(400).json({ message: 'Workspace slug is already taken' });
                }
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            const userRole = isFirstUser ? 'super_admin' : 'owner';

            const [newUser] = await db.insert(users).values({
                name,
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: userRole,
                isEmailVerified: isFirstUser // super admin verified by default
            }).returning();

            let newWorkspace = null;
            let inviteCode = '';
            let inviteLink = '';
            if (!isFirstUser) {
                // Create workspace when this is not the initial super admin
                inviteCode = generateInviteCode();
                inviteLink = `${env.FRONTEND_URL || 'http://localhost:5173'}/register?code=${inviteCode}`;

                const [workspaceRecord] = await db.insert(workspaces).values({
                    name: workspaceName,
                    slug: workspaceSlug.toLowerCase().trim(),
                    inviteCode,
                    inviteLink,
                    ownerId: newUser.id,
                    status: 'active'
                }).returning();
                newWorkspace = workspaceRecord;

                // Add owner to workspaceMembers
                await db.insert(workspaceMembers).values({
                    workspaceId: newWorkspace.id,
                    userId: newUser.id,
                    role: 'owner',
                    status: 'active'
                });

                // Log activity
                await db.insert(activityLogs).values({
                    workspaceId: newWorkspace.id,
                    userId: newUser.id,
                    action: 'CREATE_WORKSPACE',
                    entityType: 'workspace',
                    entityId: newWorkspace.id,
                    details: `Workspace ${workspaceName} created by owner ${name}`,
                    ipAddress: (req as any).clientIp || req.ip || null
                });
            }

            // Trigger verification email for the new workspace owner
            if (!isFirstUser) {
                const emailResult = await queries.sendNewVerificationEmail(newUser.id, newUser.email);
                if (!emailResult?.success) {
                    console.warn('Workspace creation verification email failed:', emailResult?.error || emailResult?.message);
                }

                await NotificationService.dispatch({
                    event: 'workspace.created',
                    userId: newUser.id,
                    workspaceId: newWorkspace!.id,
                    entityType: 'workspace',
                    entityId: newWorkspace!.id,
                    title: 'Workspace Created Successfully',
                    message: `Your workspace "${workspaceName}" was successfully set up.`,
                    link: '/admin-settings?tab=invite',
                    emailTemplate: 'workspaceCreated',
                    emailData: {
                        workspaceName: workspaceName,
                        link: `${env.FRONTEND_URL}/admin-settings`,
                        inviteCode: inviteCode,
                        inviteLink: inviteLink
                    },
                });
            }

            return res.status(201).json({
                message: isFirstUser ? 'Super admin created successfully.' : 'Workspace created successfully. Please verify your email to log in.',
                workspace: newWorkspace,
                user: { id: newUser.id, name: newUser.name, email: newUser.email }
            });
        } catch (error: any) {
            console.error('Error in createWorkspace:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Option 2: Join Existing Workspace
    static async joinWorkspace(req: Request, res: Response) {
        try {
            const { name, email, password, inviteCode, workspacePassword } = req.body;
            if (!name || !email || !password || !inviteCode) {
                return res.status(400).json({ message: 'Name, email, password, and invite code are required' });
            }

            // Check if workspace exists
            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.inviteCode, inviteCode.trim()));
            if (!workspace) {
                return res.status(404).json({ message: 'Invalid Invite Code' });
            }

            // Check optional workspace password
            if (workspace.password && workspace.password !== workspacePassword) {
                return res.status(400).json({ message: 'Incorrect Workspace Password' });
            }

            // Check if the user account already exists
            let user = await queries.getUserByEmail(email);
            let pendingMembership = null;
            let verificationSent = false;

            if (user) {
                const [membership] = await db.select().from(workspaceMembers).where(
                    and(
                        eq(workspaceMembers.workspaceId, workspace.id),
                        eq(workspaceMembers.userId, user.id)
                    )
                );

                if (membership) {
                    if (membership.status === 'active') {
                        return res.status(400).json({ message: 'You are already a member of this workspace.' });
                    }
                    if (membership.status === 'pending') {
                        pendingMembership = membership;
                    } else {
                        return res.status(400).json({ message: `You have already requested or joined this workspace (Status: ${membership.status})` });
                    }
                }

                if (!user.isEmailVerified) {
                    const emailResult = await queries.sendNewVerificationEmail(user.id, user.email);
                    if (!emailResult?.success) {
                        console.warn('Existing user verification email failed for join request:', emailResult?.error || emailResult?.message);
                    }
                    verificationSent = true;
                }
            } else {
                const hashedPassword = await bcrypt.hash(password, 10);
                [user] = await db.insert(users).values({
                    name,
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: 'employee',
                    isEmailVerified: false
                }).returning();

                await queries.sendNewVerificationEmail(user.id, user.email);
                verificationSent = true;
            }

            let membershipRecord;
            if (pendingMembership) {
                membershipRecord = pendingMembership;
                await db.update(workspaceMembers)
                    .set({ status: 'active' })
                    .where(eq(workspaceMembers.id, pendingMembership.id));
            } else {
                const [newMembership] = await db.insert(workspaceMembers).values({
                    workspaceId: workspace.id,
                    userId: user.id,
                    role: 'employee',
                    status: 'active'
                }).returning({ id: workspaceMembers.id });
                membershipRecord = newMembership;
            }

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: workspace.id,
                userId: user.id,
                action: 'JOINED_WORKSPACE',
                entityType: 'workspace',
                entityId: workspace.id,
                details: `User ${name} joined workspace ${workspace.name}`,
                ipAddress: (req as any).clientIp || req.ip || null
            });

            return res.status(201).json({
                message: 'Registration successful! You have joined the workspace successfully.',
                verificationSent
            });
        } catch (error) {
            console.error('Error in joinWorkspace:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get Pending Requests for Workspace Owner
    static async getPendingRequests(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(activeWorkspaceId)) return res.status(400).json({ message: 'Invalid or missing Workspace ID' });

            // Verify requesting user is owner or manager in this workspace
            const [membership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.userId, user.id)
                )
            );
            if (!membership || (membership.role !== 'owner' && membership.role !== 'admin' && membership.role !== 'manager')) {
                return res.status(403).json({ message: 'Only workspace owners or managers can view join requests' });
            }

            const pendingList = await db.select({
                membershipId: workspaceMembers.id,
                userId: users.id,
                name: users.name,
                email: users.email,
                joinedAt: workspaceMembers.joinedAt
            })
                .from(workspaceMembers)
                .innerJoin(users, eq(workspaceMembers.userId, users.id))
                .where(
                    and(
                        eq(workspaceMembers.workspaceId, activeWorkspaceId),
                        eq(workspaceMembers.status, 'pending')
                    )
                );

            return res.status(200).json(pendingList);
        } catch (error) {
            console.error('Error in getPendingRequests:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Approve / Reject join request
    static async approveMember(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const requestedWorkspaceId = req.body.workspaceId ? parseInt(req.body.workspaceId, 10) : parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(requestedWorkspaceId)) return res.status(400).json({ message: 'Invalid or missing Workspace ID' });

            const activeWorkspaceId = requestedWorkspaceId;
            const { membershipId, action } = req.body; // action: 'approve' or 'reject'
            const parsedMembershipId = Number(membershipId);
            if (!Number.isInteger(parsedMembershipId) || parsedMembershipId <= 0 || !action || (action !== 'approve' && action !== 'reject')) {
                return res.status(400).json({ message: 'Invalid action parameters' });
            }

            // Verify requesting user is owner or admin in this workspace
            const [ownerMembership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.userId, user.id)
                )
            );
            if (!ownerMembership || (ownerMembership.role !== 'owner' && ownerMembership.role !== 'admin')) {
                return res.status(403).json({ message: 'Only workspace owners or admins can approve join requests' });
            }

            // Find target membership in the current workspace only
            const [targetMembership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.id, parsedMembershipId),
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.status, 'pending')
                )
            );
            if (!targetMembership) {
                return res.status(404).json({ message: 'Join request not found or already processed' });
            }

            const targetUser = await queries.findUserById(targetMembership.userId);
            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, activeWorkspaceId));

            if (action === 'approve') {
                const updatedMembership = await db.update(workspaceMembers).set({
                    status: 'active'
                }).where(
                    and(
                        eq(workspaceMembers.id, parsedMembershipId),
                        eq(workspaceMembers.workspaceId, activeWorkspaceId),
                        eq(workspaceMembers.status, 'pending')
                    )
                ).returning({ id: workspaceMembers.id });

                if (updatedMembership.length === 0) {
                    return res.status(404).json({ message: 'Join request not found or already processed' });
                }

                // Log activity
                await db.insert(activityLogs).values({
                    workspaceId: activeWorkspaceId,
                    userId: user.id,
                    action: 'APPROVE_JOIN_REQUEST',
                    entityType: 'user',
                    entityId: targetMembership.userId,
                    details: `Approved join request for user ID ${targetMembership.userId}`,
                    ipAddress: (req as any).clientIp || req.ip || null
                });

                if (targetUser && workspace) {
                    await NotificationService.dispatch({
                        event: 'workspace.approval',
                        userId: targetUser.id,
                        workspaceId: workspace.id,
                        entityType: 'workspace',
                        entityId: workspace.id,
                        title: 'Join Request Approved 🎉',
                        message: `Your request to join "${workspace.name}" has been approved!`,
                        link: '/dashboard',
                        emailTemplate: 'workspaceApproval',
                        emailData: {
                            workspaceName: workspace.name,
                            link: `${env.FRONTEND_URL}/dashboard`,
                        },
                    });
                }

                await db.update(notifications).set({
                    isArchived: true
                }).where(
                    and(
                        eq(notifications.type, 'workspace.joinRequest'),
                        eq(notifications.entityId, parsedMembershipId)
                    )
                );
            } else {
                const updatedMembership = await db.update(workspaceMembers).set({
                    status: 'rejected'
                }).where(
                    and(
                        eq(workspaceMembers.id, parsedMembershipId),
                        eq(workspaceMembers.workspaceId, activeWorkspaceId),
                        eq(workspaceMembers.status, 'pending')
                    )
                ).returning({ id: workspaceMembers.id });

                if (updatedMembership.length === 0) {
                    return res.status(404).json({ message: 'Join request not found or already processed' });
                }

                // Log activity
                await db.insert(activityLogs).values({
                    workspaceId: activeWorkspaceId,
                    userId: user.id,
                    action: 'REJECT_JOIN_REQUEST',
                    entityType: 'user',
                    entityId: targetMembership.userId,
                    details: `Rejected join request for user ID ${targetMembership.userId}`,
                    ipAddress: (req as any).clientIp || req.ip || null
                });

                if (targetUser && workspace) {
                    await NotificationService.dispatch({
                        event: 'workspace.rejection',
                        userId: targetUser.id,
                        workspaceId: workspace.id,
                        entityType: 'workspace',
                        entityId: workspace.id,
                        title: 'Join Request Rejected',
                        message: `Your request to join "${workspace.name}" was not approved at this time.`,
                        emailTemplate: 'workspaceRejection',
                        emailData: {
                            workspaceName: workspace.name,
                        },
                    });
                }

                await db.update(notifications).set({
                    isArchived: true
                }).where(
                    and(
                        eq(notifications.type, 'workspace.joinRequest'),
                        eq(notifications.entityId, parsedMembershipId)
                    )
                );
            }

            return res.status(200).json({ message: `User join request ${action}ed successfully.` });
        } catch (error) {
            console.error('Error in approveMember:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Bulk Approve / Reject join requests
    static async bulkApproveMembers(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const requestedWorkspaceId = req.body.workspaceId ? parseInt(req.body.workspaceId, 10) : parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(requestedWorkspaceId)) return res.status(400).json({ message: 'Invalid or missing Workspace ID' });

            const activeWorkspaceId = requestedWorkspaceId;
            const { membershipIds, action } = req.body; // action: 'approve' or 'reject'
            if (!membershipIds || !Array.isArray(membershipIds) || membershipIds.length === 0 || !action || (action !== 'approve' && action !== 'reject')) {
                return res.status(400).json({ message: 'Invalid bulk action parameters' });
            }

            // Verify requesting user is owner or admin in this workspace
            const [ownerMembership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.userId, user.id)
                )
            );
            if (!ownerMembership || (ownerMembership.role !== 'owner' && ownerMembership.role !== 'admin')) {
                return res.status(403).json({ message: 'Only workspace owners or admins can approve join requests' });
            }

            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, activeWorkspaceId));

            for (const membershipId of membershipIds) {
                const parsedMembershipId = Number(membershipId);
                if (!Number.isInteger(parsedMembershipId) || parsedMembershipId <= 0) {
                    continue;
                }

                // Find target membership in the current workspace only
                const [targetMembership] = await db.select().from(workspaceMembers).where(
                    and(
                        eq(workspaceMembers.id, parsedMembershipId),
                        eq(workspaceMembers.workspaceId, activeWorkspaceId),
                        eq(workspaceMembers.status, 'pending')
                    )
                );
                if (!targetMembership) {
                    continue; // Skip invalid or already processed request
                }

                const targetUser = await queries.findUserById(targetMembership.userId);

                if (action === 'approve') {
                    const updatedMembership = await db.update(workspaceMembers).set({
                        status: 'active'
                    }).where(
                        and(
                            eq(workspaceMembers.id, parsedMembershipId),
                            eq(workspaceMembers.workspaceId, activeWorkspaceId),
                            eq(workspaceMembers.status, 'pending')
                        )
                    ).returning({ id: workspaceMembers.id });

                    if (updatedMembership.length === 0) {
                        continue;
                    }

                    // Log activity
                    await db.insert(activityLogs).values({
                        workspaceId: activeWorkspaceId,
                        userId: user.id,
                        action: 'APPROVE_JOIN_REQUEST',
                        entityType: 'user',
                        entityId: targetMembership.userId,
                        details: `Bulk approved join request for user ID ${targetMembership.userId}`,
                        ipAddress: (req as any).clientIp || req.ip || null
                    });

                    if (targetUser && workspace) {
                        await NotificationService.dispatch({
                            event: 'workspace.approval',
                            userId: targetUser.id,
                            workspaceId: workspace.id,
                            entityType: 'workspace',
                            entityId: workspace.id,
                            title: 'Join Request Approved 🎉',
                            message: `Your request to join "${workspace.name}" has been approved!`,
                            link: '/dashboard',
                            emailTemplate: 'workspaceApproval',
                            emailData: {
                                workspaceName: workspace.name,
                                link: `${env.FRONTEND_URL}/dashboard`,
                            },
                        });
                    }
                } else {
                    const updatedMembership = await db.update(workspaceMembers).set({
                        status: 'rejected'
                    }).where(
                        and(
                            eq(workspaceMembers.id, parsedMembershipId),
                            eq(workspaceMembers.workspaceId, activeWorkspaceId),
                            eq(workspaceMembers.status, 'pending')
                        )
                    ).returning({ id: workspaceMembers.id });

                    if (updatedMembership.length === 0) {
                        continue;
                    }

                    // Log activity
                    await db.insert(activityLogs).values({
                        workspaceId: activeWorkspaceId,
                        userId: user.id,
                        action: 'REJECT_JOIN_REQUEST',
                        entityType: 'user',
                        entityId: targetMembership.userId,
                        details: `Bulk rejected join request for user ID ${targetMembership.userId}`,
                        ipAddress: (req as any).clientIp || req.ip || null
                    });

                    if (targetUser && workspace) {
                        await NotificationService.dispatch({
                            event: 'workspace.rejection',
                            userId: targetUser.id,
                            workspaceId: workspace.id,
                            entityType: 'workspace',
                            entityId: workspace.id,
                            title: 'Join Request Rejected',
                            message: `Your request to join "${workspace.name}" was not approved at this time.`,
                            emailTemplate: 'workspaceRejection',
                            emailData: {
                                workspaceName: workspace.name,
                            },
                        });
                    }
                }
            }

            return res.status(200).json({ message: `Bulk request completed: ${membershipIds.length} requests ${action}ed.` });
        } catch (error) {
            console.error('Error in bulkApproveMembers:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Switch Active Workspace
    static async switchActiveWorkspace(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { workspaceId } = req.body;
            if (!workspaceId) return res.status(400).json({ message: 'Workspace ID is required' });

            const wId = parseInt(workspaceId, 10);
            if (isNaN(wId)) return res.status(400).json({ message: 'Invalid Workspace ID' });

            // Validate that the user is an active member
            const [membership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.workspaceId, wId),
                    eq(workspaceMembers.userId, user.id),
                    eq(workspaceMembers.status, 'active')
                )
            );

            // Bypass check for super admins
            const fullUser = await queries.findUserById(user.id);
            const isSuperAdmin = fullUser?.role === 'super_admin';

            if (!membership && !isSuperAdmin) {
                return res.status(403).json({ message: 'You are not an active member of this workspace' });
            }

            // Get workspace info
            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, wId));
            if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
            if (workspace.status === 'suspended') {
                return res.status(403).json({ message: 'This workspace has been suspended by system administrators.' });
            }

            // Regenerate cookie tokens with new workspace context
            const accessToken = queries.createAccessToken({
                id: user.id,
                name: user.name,
                email: user.email,
                role: isSuperAdmin ? 'super_admin' : (membership?.role || 'employee'),
                activeWorkspaceId: wId,
                workspaceName: workspace.name,
                workspaceSlug: workspace.slug,
                isEmailVerified: fullUser?.isEmailVerified,
                is2faEnabled: fullUser?.is2faEnabled,
                sessionId: user.sessionId
            });

            const baseConfig = {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
            };

            res.cookie('accessToken', accessToken, {
                ...baseConfig,
                maxAge: 15 * 60 * 1000 // 15 mins
            });

            return res.status(200).json({
                message: 'Workspace switched successfully',
                accessToken,
                workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, role: isSuperAdmin ? 'super_admin' : membership?.role }
            });
        } catch (error) {
            console.error('Error in switchActiveWorkspace:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get all user workspaces
    static async getUserWorkspaces(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const fullUser = await queries.findUserById(user.id);
            if (fullUser?.role === 'super_admin') {
                // Super admins can view/access all workspaces
                const allWorkspacesList = await db.select().from(workspaces);
                return res.status(200).json(allWorkspacesList.map(w => ({
                    workspace: w,
                    role: 'super_admin',
                    status: 'active'
                })));
            }

            const list = await db.select({
                workspace: workspaces,
                role: workspaceMembers.role,
                status: workspaceMembers.status
            })
                .from(workspaceMembers)
                .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
                .where(eq(workspaceMembers.userId, user.id));

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error in getUserWorkspaces:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get current workspace info (invite code, invite link, etc.)
    static async getWorkspaceInfo(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) {
                return res.status(400).json({ message: 'No active workspace' });
            }

            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, activeWorkspaceId));
            if (!workspace) {
                return res.status(404).json({ message: 'Workspace not found' });
            }

            // Check user is owner or admin
            const [membership] = await db.select()
                .from(workspaceMembers)
                .where(and(
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.userId, user.id)
                ));

            const fullUser = await queries.findUserById(user.id);
            const isAuthorized = fullUser?.role === 'super_admin' ||
                membership?.role === 'owner' ||
                membership?.role === 'admin';

            if (!isAuthorized) {
                return res.status(403).json({ message: 'Only workspace owners and admins can view workspace details' });
            }

            // Count members
            const membersList = await db.select()
                .from(workspaceMembers)
                .where(eq(workspaceMembers.workspaceId, activeWorkspaceId));

            return res.status(200).json({
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
                inviteCode: workspace.inviteCode,
                inviteLink: workspace.inviteLink,
                status: workspace.status,
                memberCount: membersList.length,
                createdAt: workspace.createdAt
            });
        } catch (error) {
            console.error('Error in getWorkspaceInfo:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Update Workspace Settings
    static async updateSettings(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(activeWorkspaceId)) return res.status(400).json({ message: 'Invalid Workspace ID' });

            // Verify role
            const [membership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.userId, user.id)
                )
            );
            if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
                return res.status(403).json({ message: 'Only workspace owners or admins can update settings' });
            }

            const { name, logo, description, officeStart, officeEnd, workingDays, holidays, leavePolicy, workspacePassword } = req.body;

            const updateData: any = {};
            if (name) updateData.name = name;
            if (logo !== undefined) updateData.logo = logo;
            if (description !== undefined) updateData.description = description;
            if (officeStart) updateData.officeStart = officeStart;
            if (officeEnd) updateData.officeEnd = officeEnd;
            if (workingDays) updateData.workingDays = workingDays;
            if (holidays) updateData.holidays = JSON.stringify(holidays);
            if (leavePolicy) updateData.leavePolicy = JSON.stringify(leavePolicy);
            if (workspacePassword !== undefined) updateData.password = workspacePassword || null;

            updateData.updatedAt = new Date();

            const [updated] = await db.update(workspaces).set(updateData).where(eq(workspaces.id, activeWorkspaceId)).returning();

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                action: 'UPDATE_WORKSPACE_SETTINGS',
                entityType: 'workspace',
                entityId: activeWorkspaceId,
                details: `Updated settings for workspace ${updated.name}`,
                ipAddress: (req as any).clientIp || req.ip || null
            });

            return res.status(200).json({ message: 'Workspace settings updated successfully', workspace: updated });
        } catch (error) {
            console.error('Error in updateSettings:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Regenerate Invite Code / Link
    static async regenerateInvite(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(activeWorkspaceId)) return res.status(400).json({ message: 'Invalid Workspace ID' });

            const [membership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.userId, user.id)
                )
            );
            if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
                return res.status(403).json({ message: 'Only workspace owners or admins can regenerate invite codes' });
            }

            const inviteCode = generateInviteCode();
            const inviteLink = `${env.FRONTEND_URL || 'http://localhost:5173'}/register?code=${inviteCode}`;

            const [updated] = await db.update(workspaces).set({
                inviteCode,
                inviteLink,
                updatedAt: new Date()
            }).where(eq(workspaces.id, activeWorkspaceId)).returning();

            return res.status(200).json({
                message: 'Invite link regenerated successfully',
                inviteCode: updated.inviteCode,
                inviteLink: updated.inviteLink
            });
        } catch (error) {
            console.error('Error in regenerateInvite:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async inviteMembers(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(activeWorkspaceId)) return res.status(400).json({ message: 'Invalid or missing Workspace ID' });

            const [membership] = await db.select().from(workspaceMembers).where(
                and(
                    eq(workspaceMembers.workspaceId, activeWorkspaceId),
                    eq(workspaceMembers.userId, user.id)
                )
            );
            if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
                return res.status(403).json({ message: 'Only workspace owners or admins can invite members' });
            }

            const { emails, note } = req.body;
            if (!emails || (!Array.isArray(emails) && typeof emails !== 'string')) {
                return res.status(400).json({ message: 'Email or list of emails is required' });
            }

            const emailList = Array.isArray(emails) ? emails : [emails];
            const validEmails = emailList
                .map((email: string) => String(email || '').trim().toLowerCase())
                .filter((email: string) => email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

            if (validEmails.length === 0) {
                return res.status(400).json({ message: 'At least one valid email is required' });
            }

            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, activeWorkspaceId));
            if (!workspace) {
                return res.status(404).json({ message: 'Workspace not found' });
            }

            const inviteLink = workspace.inviteLink || `${env.FRONTEND_URL || 'http://localhost:5173'}/register?code=${workspace.inviteCode}`;
            const inviteNote = String(note || '').trim();

            for (const inviteEmail of validEmails) {
                try {
                    await EmailTriggerService.sendInviteEmail(inviteEmail, workspace.name, inviteLink, workspace.id, inviteNote);
                } catch (emailErr) {
                    console.warn(`Failed to send workspace invite to ${inviteEmail}:`, emailErr);
                }
            }

            await db.insert(activityLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                action: 'SEND_WORKSPACE_INVITES',
                entityType: 'workspace',
                entityId: activeWorkspaceId,
                details: `Invited ${validEmails.length} member(s) to workspace ${workspace.name}`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            return res.status(200).json({ message: `Sent invite email to ${validEmails.length} recipient(s).` });
        } catch (error) {
            console.error('Error in inviteMembers:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async getWorkspaceMembers(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const list = await db.select({
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
                role: workspaceMembers.role,
                position: users.position
            })
                .from(workspaceMembers)
                .innerJoin(users, eq(workspaceMembers.userId, users.id))
                .where(
                    and(
                        eq(workspaceMembers.workspaceId, activeWorkspaceId),
                        eq(workspaceMembers.status, 'active')
                    )
                );

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error in getWorkspaceMembers:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async assignProjectManager(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            // Only workspace owners and admins can assign PMs
            if (user.role !== 'owner' && user.role !== 'admin') {
                return res.status(403).json({ message: 'Only workspace owners/admins can assign project managers' });
            }

            const { userId, projectId } = req.body;
            if (!userId || !projectId) {
                return res.status(400).json({ message: 'User ID and Project ID are required' });
            }

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            // 1. Verify project exists in this workspace
            const [project] = await db.select()
                .from(projects)
                .where(and(eq(projects.id, projectId), eq(projects.workspaceId, activeWorkspaceId)));

            if (!project) {
                return res.status(404).json({ message: 'Project not found in this workspace' });
            }

            // 2. Verify target user exists and is an active member of this workspace
            const [targetMember] = await db.select({
                id: users.id,
                email: users.email,
                name: users.name
            })
                .from(workspaceMembers)
                .innerJoin(users, eq(workspaceMembers.userId, users.id))
                .where(
                    and(
                        eq(workspaceMembers.workspaceId, activeWorkspaceId),
                        eq(workspaceMembers.userId, userId),
                        eq(workspaceMembers.status, 'active')
                    )
                );

            if (!targetMember) {
                return res.status(404).json({ message: 'User is not an active member of this workspace' });
            }

            // 3. Upsert user as project manager in projectMembers
            const [existingProjectMember] = await db.select()
                .from(projectMembers)
                .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

            if (existingProjectMember) {
                await db.update(projectMembers)
                    .set({ role: 'manager' })
                    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
            } else {
                await db.insert(projectMembers)
                    .values({
                        projectId,
                        userId,
                        role: 'manager',
                        joinedAt: new Date()
                    });
            }

            // 4. Send Unified Notification via NotificationService
            await NotificationService.dispatch({
                event: 'project.assigned',
                userId: userId,
                workspaceId: activeWorkspaceId,
                entityType: 'project',
                entityId: projectId,
                title: 'Appointed Project Manager',
                message: `You have been officially appointed as the Project Manager for project "${project.name}".`,
                link: `/projects/${projectId}`,
                emailTemplate: 'projectManagerAssigned',
                emailData: {
                    projectName: project.name,
                    link: `${env.FRONTEND_URL}/projects/${projectId}`,
                },
            });

            // 6. Log activity
            await db.insert(activityLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                action: 'ASSIGN_PM',
                entityType: 'project',
                entityId: projectId,
                details: `Workspace owner assigned ${targetMember.name} as PM for project ${project.name}`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            return res.status(200).json({ message: 'Project Manager assigned successfully' });
        } catch (error) {
            console.error('Error in assignProjectManager:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

