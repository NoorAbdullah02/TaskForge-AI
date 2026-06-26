import { Request, Response } from 'express';
import { db } from '../db/index';
import { workspaces, workspaceMembers, users, activityLogs, projects, projectMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as queries from '../db/queries';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { socketService } from '../services/socket.service';
import { env } from '../config/env';

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
            if (!name || !email || !password || !workspaceName || !workspaceSlug) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check if user already exists
            let user = await queries.getUserByEmail(email);
            if (user) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            // Check if slug is taken
            const [existingWorkspace] = await db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug.toLowerCase()));
            if (existingWorkspace) {
                return res.status(400).json({ message: 'Workspace slug is already taken' });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Register user
            const allUsers = await db.select().from(users).limit(1);
            const isFirstUser = allUsers.length === 0;
            const userRole = isFirstUser ? 'super_admin' : 'workspace_owner';

            const [newUser] = await db.insert(users).values({
                name,
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: userRole,
                isEmailVerified: isFirstUser // super admin verified by default
            }).returning();

            // Create workspace
            const inviteCode = generateInviteCode();
            const inviteLink = `${env.FRONTEND_URL || 'http://localhost:5173'}/register?code=${inviteCode}`;

            const [newWorkspace] = await db.insert(workspaces).values({
                name: workspaceName,
                slug: workspaceSlug.toLowerCase().trim(),
                inviteCode,
                inviteLink,
                ownerId: newUser.id,
                status: 'active'
            }).returning();

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

            // Trigger Brevo Emails
            // 1. Account verification (only if not bootstrapped first user)
            if (!isFirstUser) {
                const otp = queries.generateRandomToken(6);
                const expires = new Date(Date.now() + 15 * 60 * 1000);
                await queries.saveEmailVerificationToken(newUser.id, otp, expires);
                await EmailTriggerService.sendAccountVerification(newUser.email, newUser.name, otp);
            }

            // 2. Workspace created confirmation email
            await EmailTriggerService.sendWorkspaceCreated(newUser.email, newUser.name, workspaceName, newWorkspace.id);

            return res.status(201).json({
                message: 'Workspace created successfully. Please verify your email to log in.',
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

            // Check if user already exists
            let user = await queries.getUserByEmail(email);
            if (user) {
                // If user exists, check if they are already a member or pending
                const [membership] = await db.select().from(workspaceMembers).where(
                    and(
                        eq(workspaceMembers.workspaceId, workspace.id),
                        eq(workspaceMembers.userId, user.id)
                    )
                );
                if (membership) {
                    return res.status(400).json({ message: `You have already requested or joined this workspace (Status: ${membership.status})` });
                }
            } else {
                // Create user
                const hashedPassword = await bcrypt.hash(password, 10);
                [user] = await db.insert(users).values({
                    name,
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: 'employee',
                    isEmailVerified: false
                }).returning();

                // Send email verification OTP
                const otp = queries.generateRandomToken(6);
                const expires = new Date(Date.now() + 15 * 60 * 1000);
                await queries.saveEmailVerificationToken(user.id, otp, expires);
                await EmailTriggerService.sendAccountVerification(user.email, user.name, otp);
            }

            // Insert pending workspace membership
            await db.insert(workspaceMembers).values({
                workspaceId: workspace.id,
                userId: user.id,
                role: 'employee',
                status: 'pending'
            });

            // Get owner details for notifications
            const owner = await queries.findUserById(workspace.ownerId || 0);

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: workspace.id,
                userId: user.id,
                action: 'JOIN_REQUEST_SUBMITTED',
                entityType: 'workspace',
                entityId: workspace.id,
                details: `User ${name} submitted join request to workspace ${workspace.name}`,
                ipAddress: (req as any).clientIp || req.ip || null
            });

            if (owner) {
                // 1. In-App DB Notification
                await socketService.sendNotification(
                    owner.id,
                    'New Join Request',
                    `${name} (${email}) has requested to join your workspace "${workspace.name}".`,
                    'join_request'
                );

                // 2. Real-Time Socket.io Alert to Owner Room
                socketService.broadcastToWorkspace(workspace.id, 'join_request_alert', {
                    workspaceId: workspace.id,
                    requesterName: name,
                    requesterEmail: email
                });

                // 3. Trigger Brevo Email
                await EmailTriggerService.sendWorkspaceJoinRequest(
                    owner.email,
                    owner.name,
                    name,
                    email,
                    workspace.name,
                    workspace.id
                );
            }

            return res.status(201).json({
                message: 'Registration successful! Your request to join the workspace has been sent to the workspace owner for approval.'
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

            const activeWorkspaceId = parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(activeWorkspaceId)) return res.status(400).json({ message: 'Invalid or missing Workspace ID' });

            const { membershipId, action } = req.body; // action: 'approve' or 'reject'
            if (!membershipId || !action || (action !== 'approve' && action !== 'reject')) {
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

            // Find target membership
            const [targetMembership] = await db.select().from(workspaceMembers).where(eq(workspaceMembers.id, membershipId));
            if (!targetMembership || targetMembership.workspaceId !== activeWorkspaceId) {
                return res.status(404).json({ message: 'Join request not found' });
            }

            const targetUser = await queries.findUserById(targetMembership.userId);
            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, activeWorkspaceId));

            if (action === 'approve') {
                await db.update(workspaceMembers).set({
                    status: 'active'
                }).where(eq(workspaceMembers.id, membershipId));

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
                    // Send approval and welcome email
                    await EmailTriggerService.sendWorkspaceApproval(targetUser.email, targetUser.name, workspace.name, workspace.id);
                    await socketService.sendNotification(
                        targetUser.id,
                        'Join Request Approved',
                        `Your request to join "${workspace.name}" has been approved!`,
                        'workspace_update'
                    );
                }
            } else {
                await db.update(workspaceMembers).set({
                    status: 'rejected'
                }).where(eq(workspaceMembers.id, membershipId));

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
                    await EmailTriggerService.sendWorkspaceRejection(targetUser.email, targetUser.name, workspace.name, workspace.id);
                }
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

            const activeWorkspaceId = parseInt(req.headers['x-workspace-id'] as string, 10);
            if (isNaN(activeWorkspaceId)) return res.status(400).json({ message: 'Invalid or missing Workspace ID' });

            const { membershipIds, action } = req.body; // action: 'approve' or 'reject'
            if (!membershipIds || !Array.isArray(membershipIds) || !action || (action !== 'approve' && action !== 'reject')) {
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
                // Find target membership
                const [targetMembership] = await db.select().from(workspaceMembers).where(eq(workspaceMembers.id, membershipId));
                if (!targetMembership || targetMembership.workspaceId !== activeWorkspaceId) {
                    continue; // Skip invalid request
                }

                const targetUser = await queries.findUserById(targetMembership.userId);

                if (action === 'approve') {
                    await db.update(workspaceMembers).set({
                        status: 'active'
                    }).where(eq(workspaceMembers.id, membershipId));

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
                        await EmailTriggerService.sendWorkspaceApproval(targetUser.email, targetUser.name, workspace.name, workspace.id);
                        await socketService.sendNotification(
                            targetUser.id,
                            'Join Request Approved',
                            `Your request to join "${workspace.name}" has been approved!`,
                            'workspace_update'
                        );
                    }
                } else {
                    await db.update(workspaceMembers).set({
                        status: 'rejected'
                    }).where(eq(workspaceMembers.id, membershipId));

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
                        await EmailTriggerService.sendWorkspaceRejection(targetUser.email, targetUser.name, workspace.name, workspace.id);
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

            // 4. Send Email
            await EmailTriggerService.sendProjectManagerAssigned(
                targetMember.email,
                targetMember.name,
                project.name,
                activeWorkspaceId
            );

            // 5. Realtime & Dashboard Notification
            await socketService.sendNotification(
                userId,
                'Project Manager Appointment',
                `You have been appointed as the Project Manager for project "${project.name}" in workspace "${user.workspaceName || 'your organization'}".`,
                'pm_assigned'
            );

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

