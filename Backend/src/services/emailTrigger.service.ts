import { db } from '../db/index';
import { emailLogs } from '../db/schema';
import { sendMail } from '../lib/send-email';

function getBaseTemplate(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      background-color: #0b0f19;
      color: #f3f4f6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #3b82f6;
      text-decoration: none;
    }
    .logo span {
      background: linear-gradient(to right, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      color: #8b5cf6;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .content {
      font-size: 15px;
      line-height: 1.6;
      color: #9ca3af;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: #4b5563;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 20px;
    }
    .otp {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 4px;
      color: #3b82f6;
      text-align: center;
      background: rgba(59, 130, 246, 0.08);
      border: 1px dashed rgba(59, 130, 246, 0.3);
      padding: 15px;
      border-radius: 16px;
      margin: 25px 0;
      font-family: monospace;
    }
    .highlight {
      color: #ffffff;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="#" class="logo">TaskForge <span>AI</span></a>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} TaskForge AI. All rights reserved.<br>
        This is an automated enterprise notifications transmission.
      </div>
    </div>
  </div>
</body>
</html>
    `;
}

async function triggerEmail(
    workspaceId: number | null,
    recipient: string,
    subject: string,
    eventType: string,
    bodyHtml: string
) {
    try {
        const htmlContent = getBaseTemplate(subject, bodyHtml);
        await sendMail(recipient, subject, htmlContent);
        
        // Log in the db
        await db.insert(emailLogs).values({
            workspaceId,
            recipient,
            subject,
            eventType,
            status: 'sent',
            createdAt: new Date()
        });
    } catch (err: any) {
        console.error(`Failed to send/log email for ${eventType}:`, err);
        try {
            await db.insert(emailLogs).values({
                workspaceId,
                recipient,
                subject,
                eventType,
                status: 'failed',
                errorMessage: err.message || JSON.stringify(err),
                createdAt: new Date()
            });
        } catch (dbErr) {
            console.error('Failed to write failure log to database:', dbErr);
        }
    }
}

export class EmailTriggerService {
    // 1. Account Verification
    static async sendAccountVerification(email: string, name: string, otp: string) {
        const body = `
            <h2 class="title">Verify Your Account</h2>
            <p>Hi <span class="highlight">${name}</span>,</p>
            <p>Welcome to TaskForge AI. Please verify your email address by entering the 6-digit OTP code below:</p>
            <div class="otp">${otp}</div>
            <p>This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
        `;
        await triggerEmail(null, email, 'Verify Your TaskForge AI Account', 'account_verification', body);
    }

    // 2. Password Reset
    static async sendPasswordReset(email: string, name: string, otp: string) {
        const body = `
            <h2 class="title">Reset Your Password</h2>
            <p>Hi <span class="highlight">${name}</span>,</p>
            <p>We received a request to reset your password. Use the following OTP code to proceed:</p>
            <div class="otp">${otp}</div>
            <p>This code expires in 15 minutes. If you did not make this request, please secure your account immediately.</p>
        `;
        await triggerEmail(null, email, 'TaskForge AI Password Reset Request', 'password_reset', body);
    }

    // 3. Workspace Created
    static async sendWorkspaceCreated(email: string, ownerName: string, workspaceName: string, workspaceId: number) {
        const body = `
            <h2 class="title">Workspace Confirmation</h2>
            <p>Hi <span class="highlight">${ownerName}</span>,</p>
            <p>Congratulations! Your workspace <span class="highlight">${workspaceName}</span> (ID: ${workspaceId}) has been successfully created.</p>
            <p>You are registered as the Workspace Owner. You can now configure departments, teams, invite members, and build projects.</p>
        `;
        await triggerEmail(workspaceId, email, `Workspace ${workspaceName} Created Successfully!`, 'workspace_created', body);
    }

    // 4. Workspace Join Request (sent to owner)
    static async sendWorkspaceJoinRequest(ownerEmail: string, ownerName: string, requesterName: string, requesterEmail: string, workspaceName: string, workspaceId: number) {
        const body = `
            <h2 class="title">Join Request Pending</h2>
            <p>Hi <span class="highlight">${ownerName}</span>,</p>
            <p><span class="highlight">${requesterName}</span> (${requesterEmail}) has requested to join your workspace <span class="highlight">${workspaceName}</span>.</p>
            <p>Please log in to your Workspace Settings panel to approve or reject this request.</p>
        `;
        await triggerEmail(workspaceId, ownerEmail, 'New Workspace Access Request', 'workspace_join_request', body);
    }

    // 5. Workspace Approval
    static async sendWorkspaceApproval(email: string, userName: string, workspaceName: string, workspaceId: number) {
        const body = `
            <h2 class="title">Request Approved</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your request to join the workspace <span class="highlight">${workspaceName}</span> has been approved by the workspace owner! 🎉</p>
            <p>You can now log in and begin collaborating with your team.</p>
        `;
        await triggerEmail(workspaceId, email, `Approved to join ${workspaceName}`, 'workspace_approval', body);
    }

    // 6. Workspace Rejection
    static async sendWorkspaceRejection(email: string, userName: string, workspaceName: string, workspaceId: number) {
        const body = `
            <h2 class="title">Access Denied</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Unfortunately, your request to join the workspace <span class="highlight">${workspaceName}</span> was not approved at this time.</p>
            <p>Please contact your administrator if you believe this is an error.</p>
        `;
        await triggerEmail(workspaceId, email, `Join Request Rejected for ${workspaceName}`, 'workspace_rejection', body);
    }

    // 7. Invite Email
    static async sendInviteEmail(email: string, workspaceName: string, inviteLink: string, workspaceId: number) {
        const body = `
            <h2 class="title">You've Been Invited!</h2>
            <p>Hi there,</p>
            <p>You have been invited to join the workforce workspace <span class="highlight">${workspaceName}</span> on TaskForge AI.</p>
            <p>Click the link below to verify your email and set up your password to join the team:</p>
            <div class="button-container">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
        `;
        await triggerEmail(workspaceId, email, `Invitation to join ${workspaceName}`, 'invite_email', body);
    }

    // 8. Project Created
    static async sendProjectCreated(email: string, userName: string, projectName: string, workspaceName: string, workspaceId: number) {
        const body = `
            <h2 class="title">New Project Available</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>A new project <span class="highlight">${projectName}</span> has been initiated in your workspace <span class="highlight">${workspaceName}</span>.</p>
            <p>Check the workspace Project Hub to view goals, timelines, and milestones.</p>
        `;
        await triggerEmail(workspaceId, email, `New Project Created: ${projectName}`, 'project_created', body);
    }

    // 9. Project Assignment
    static async sendProjectAssignment(email: string, userName: string, projectName: string, workspaceId: number) {
        const body = `
            <h2 class="title">Project Member Assignment</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>You have been assigned as a member of the project <span class="highlight">${projectName}</span>.</p>
            <p>You can now access its Kanban board and begin executing tasks.</p>
        `;
        await triggerEmail(workspaceId, email, `Assigned to Project: ${projectName}`, 'project_assignment', body);
    }

    // 10. Project Manager Assigned
    static async sendProjectManagerAssigned(email: string, pmName: string, projectName: string, workspaceId: number) {
        const body = `
            <h2 class="title">Project Manager Appointment</h2>
            <p>Hi <span class="highlight">${pmName}</span>,</p>
            <p>You have been officially appointed as the <span class="highlight">Project Manager</span> for <span class="highlight">${projectName}</span>.</p>
            <p>You now have control to establish sprints, create epics, write stories, and allocate tasks.</p>
        `;
        await triggerEmail(workspaceId, email, `Appointed PM for ${projectName}`, 'pm_assigned', body);
    }

    // 11. Task Assigned
    static async sendTaskAssigned(email: string, userName: string, taskTitle: string, projectName: string, workspaceId: number) {
        const body = `
            <h2 class="title">Task Assigned</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>You have been assigned a new task: <span class="highlight">${taskTitle}</span> inside project <span class="highlight">${projectName}</span>.</p>
            <p>Review the task details and update the status on the Kanban Board as you progress.</p>
        `;
        await triggerEmail(workspaceId, email, `Task Assigned: ${taskTitle}`, 'task_assigned', body);
    }

    // 12. Task Deadline Reminder
    static async sendTaskDeadlineReminder(email: string, userName: string, taskTitle: string, dueDate: string, workspaceId: number) {
        const body = `
            <h2 class="title">Task Due Soon</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>This is a reminder that your task <span class="highlight">${taskTitle}</span> is approaching its deadline on <span class="highlight">${dueDate}</span>.</p>
            <p>Ensure any deliverables are updated on time.</p>
        `;
        await triggerEmail(workspaceId, email, `Deadline approaching: ${taskTitle}`, 'task_deadline_reminder', body);
    }

    // 13. Task Overdue Alert
    static async sendTaskOverdueAlert(email: string, userName: string, taskTitle: string, dueDate: string, workspaceId: number) {
        const body = `
            <h2 class="title">⚠️ Task Overdue Alert</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your assigned task <span class="highlight">${taskTitle}</span> has missed its scheduled deadline on <span class="highlight">${dueDate}</span>.</p>
            <p>Please update the task status or discuss an extension with your Project Manager.</p>
        `;
        await triggerEmail(workspaceId, email, `⚠️ OVERDUE TASK: ${taskTitle}`, 'task_overdue_alert', body);
    }

    // 14. Leave Approval
    static async sendLeaveApproval(email: string, userName: string, leaveType: string, startDate: string, endDate: string, workspaceId: number) {
        const body = `
            <h2 class="title">Leave Application Approved</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your request for <span class="highlight">${leaveType} Leave</span> from <span class="highlight">${startDate}</span> to <span class="highlight">${endDate}</span> has been approved.</p>
            <p>Your department leave balance has been updated accordingly. Have a great time off!</p>
        `;
        await triggerEmail(workspaceId, email, `Leave Request Approved`, 'leave_approval', body);
    }

    // 15. Leave Rejection
    static async sendLeaveRejection(email: string, userName: string, leaveType: string, startDate: string, endDate: string, workspaceId: number) {
        const body = `
            <h2 class="title">Leave Application Rejected</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Unfortunately, your request for <span class="highlight">${leaveType} Leave</span> from <span class="highlight">${startDate}</span> to <span class="highlight">${endDate}</span> was not approved.</p>
            <p>Please speak with your department manager for details.</p>
        `;
        await triggerEmail(workspaceId, email, `Leave Request Rejected`, 'leave_rejection', body);
    }

    // 16. Attendance Warning
    static async sendAttendanceWarning(email: string, userName: string, date: string, warningType: string, workspaceId: number) {
        const body = `
            <h2 class="title">⚠️ Attendance Record Alert</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>An attendance anomaly was flagged for <span class="highlight">${date}</span>: <span class="highlight">${warningType}</span>.</p>
            <p>Please check your check-in times. Consistent late arrivals or absences will impact payroll and performance scores.</p>
        `;
        await triggerEmail(workspaceId, email, `⚠️ Attendance Notification: ${warningType}`, 'attendance_warning', body);
    }

    // 17. Monthly Attendance Report
    static async sendMonthlyAttendanceReport(email: string, userName: string, month: string, summaryText: string, workspaceId: number) {
        const body = `
            <h2 class="title">Monthly Attendance Summary</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Here is your attendance performance summary for <span class="highlight">${month}</span>:</p>
            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; margin: 15px 0;">
              ${summaryText}
            </div>
            <p>Thank you for keeping your check-ins active!</p>
        `;
        await triggerEmail(workspaceId, email, `Monthly Attendance Report - ${month}`, 'monthly_attendance_report', body);
    }

    // 18. Weekly Project Summary
    static async sendWeeklyProjectSummary(email: string, userName: string, projectName: string, summaryStats: string, workspaceId: number) {
        const body = `
            <h2 class="title">Weekly Project Summary</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Here are the key metrics for <span class="highlight">${projectName}</span> this week:</p>
            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; margin: 15px 0;">
              ${summaryStats}
            </div>
        `;
        await triggerEmail(workspaceId, email, `Weekly Update: ${projectName}`, 'weekly_project_summary', body);
    }

    // 19. AI Generated Weekly Report
    static async sendAIGeneratedReport(email: string, userName: string, summaryText: string, workspaceId: number) {
        const body = `
            <h2 class="title">💡 AI Weekly Insight Summary</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your AI assistant has analyzed workspace operations and generated the following weekly productivity overview:</p>
            <div style="background: rgba(99,102,241,0.08); border-left: 4px solid #6366f1; padding: 20px; border-radius: 12px; margin: 20px 0; font-style: italic;">
              ${summaryText}
            </div>
        `;
        await triggerEmail(workspaceId, email, `AI Weekly Productivity Summary`, 'ai_weekly_report', body);
    }

    // 20. Security Alert
    static async sendSecurityAlert(email: string, userName: string, alertDetails: string, workspaceId: number | null) {
        const body = `
            <h2 class="title" style="color: #ef4444;">🛡️ Security Alert</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>We detected a security modification on your account: <span class="highlight">${alertDetails}</span>.</p>
            <p>If you did not execute this action, please reset your password and contact the support desk immediately.</p>
        `;
        await triggerEmail(workspaceId, email, `🛡️ SECURITY ALERT: ${alertDetails}`, 'security_alert', body);
    }

    // 21. Role Changed
    static async sendRoleChanged(email: string, userName: string, newRole: string, workspaceId: number) {
        const body = `
            <h2 class="title">Workspace Role Updated</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your permissions inside the workspace have been changed. You are now designated as a <span class="highlight">${newRole}</span>.</p>
            <p>Please log in to experience your new capabilities.</p>
        `;
        await triggerEmail(workspaceId, email, `Workspace Role Changed to ${newRole}`, 'role_changed', body);
    }

    // 22. Workspace Password Reset
    static async sendWorkspacePasswordReset(email: string, userName: string, otpCode: string, workspaceId: number) {
        const body = `
            <h2 class="title">Workspace Password Reset Code</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Use the following OTP code to reset your workspace security password:</p>
            <div class="otp">${otpCode}</div>
            <p>This code will expire in 10 minutes.</p>
        `;
        await triggerEmail(workspaceId, email, 'Workspace Password Reset Code', 'workspace_password_reset', body);
    }

    // 23. Account Disabled
    static async sendAccountDisabled(email: string, userName: string, reason: string, workspaceId: number | null) {
        const body = `
            <h2 class="title" style="color: #ef4444;">Account Disabled</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your access to TaskForge AI has been temporarily disabled.</p>
            <p>Reason: <span class="highlight">${reason}</span></p>
            <p>Please contact the system administrator to resolve this issue.</p>
        `;
        await triggerEmail(workspaceId, email, 'Access Temporarily Suspended', 'account_disabled', body);
    }

    // 24. Account Enabled
    static async sendAccountEnabled(email: string, userName: string, workspaceId: number | null) {
        const body = `
            <h2 class="title" style="color: #10b981;">Account Restored</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Good news! Your access to TaskForge AI has been reactivated. You can now log back in.</p>
        `;
        await triggerEmail(workspaceId, email, 'Access Restored', 'account_enabled', body);
    }

    // 25. Sprint Started
    static async sendSprintStarted(email: string, userName: string, sprintName: string, goal: string, workspaceId: number) {
        const body = `
            <h2 class="title">Sprint Activated</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Sprint <span class="highlight">${sprintName}</span> has officially started.</p>
            <p><span class="highlight">Sprint Goal:</span> ${goal || 'No goal set'}</p>
            <p>Log in to view task assignments and board timelines.</p>
        `;
        await triggerEmail(workspaceId, email, `Sprint Started: ${sprintName}`, 'sprint_started', body);
    }

    // 26. Sprint Completed
    static async sendSprintCompleted(email: string, userName: string, sprintName: string, reportText: string, workspaceId: number) {
        const body = `
            <h2 class="title">Sprint Completed</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Sprint <span class="highlight">${sprintName}</span> has been closed. Here is the completion report summary:</p>
            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; margin: 15px 0;">
              ${reportText}
            </div>
        `;
        await triggerEmail(workspaceId, email, `Sprint Completed: ${sprintName}`, 'sprint_completed', body);
    }

    // 27. Milestone Achieved
    static async sendMilestoneAchieved(email: string, userName: string, milestoneTitle: string, projectName: string, workspaceId: number) {
        const body = `
            <h2 class="title">🏆 Milestone Achieved!</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Congratulations! The project milestone <span class="highlight">${milestoneTitle}</span> in <span class="highlight">${projectName}</span> was completed successfully! 🏆</p>
            <p>Thank you for your hard work in hitting this target.</p>
        `;
        await triggerEmail(workspaceId, email, `🏆 Milestone Met: ${milestoneTitle}`, 'milestone_achieved', body);
    }

    // Task Approved
    static async sendTaskApproved(email: string, userName: string, taskTitle: string, projectName: string, approverName: string, workspaceId: number) {
        const body = `
            <h2 class="title">✅ Task Approved</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your task <span class="highlight">${taskTitle}</span> in project <span class="highlight">${projectName}</span> has been approved by <span class="highlight">${approverName}</span>.</p>
            <p>Great work! The task has been marked as approved and is now ready for completion.</p>
        `;
        await triggerEmail(workspaceId, email, `✅ Task Approved: ${taskTitle}`, 'task_approved', body);
    }

    // Task Rejected
    static async sendTaskRejected(email: string, userName: string, taskTitle: string, reason: string, projectName: string, rejectorName: string, workspaceId: number) {
        const body = `
            <h2 class="title">❌ Task Rejected</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Your task <span class="highlight">${taskTitle}</span> in project <span class="highlight">${projectName}</span> has been rejected by <span class="highlight">${rejectorName}</span>.</p>
            <p><strong>Reason:</strong> ${reason || 'No reason provided.'}</p>
            <p>Please review the feedback and update your task accordingly.</p>
        `;
        await triggerEmail(workspaceId, email, `❌ Task Rejected: ${taskTitle}`, 'task_rejected', body);
    }

    // Task Locked
    static async sendTaskLockedAlert(email: string, userName: string, taskTitle: string, lockerName: string, workspaceId: number) {
        const body = `
            <h2 class="title">🔒 Task Locked</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>The task <span class="highlight">${taskTitle}</span> has been locked by <span class="highlight">${lockerName}</span>.</p>
            <p>Edits to this task are now restricted to prevent conflicting changes.</p>
        `;
        await triggerEmail(workspaceId, email, `🔒 Task Locked: ${taskTitle}`, 'task_locked', body);
    }

    // Task Unlocked
    static async sendTaskUnlockedAlert(email: string, userName: string, taskTitle: string, unlockerName: string, workspaceId: number) {
        const body = `
            <h2 class="title">🔓 Task Unlocked</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>The task <span class="highlight">${taskTitle}</span> has been unlocked by <span class="highlight">${unlockerName}</span>.</p>
            <p>Task edits are now open.</p>
        `;
        await triggerEmail(workspaceId, email, `🔓 Task Unlocked: ${taskTitle}`, 'task_unlocked', body);
    }

    // Watcher Status Alert
    static async sendWatcherUpdateAlert(email: string, userName: string, taskTitle: string, updateDetails: string, workspaceId: number) {
        const body = `
            <h2 class="title">🔔 Watcher Update</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>A task you are watching/following, <span class="highlight">${taskTitle}</span>, was updated:</p>
            <p><strong>Details:</strong> ${updateDetails}</p>
        `;
        await triggerEmail(workspaceId, email, `🔔 Task Update: ${taskTitle}`, 'task_watcher_update', body);
    }

    // Pomodoro Completed Alert
    static async sendPomodoroCompletedAlert(email: string, userName: string, taskTitle: string, currentCount: number, workspaceId: number) {
        const body = `
            <h2 class="title">🍅 Pomodoro Completed!</h2>
            <p>Hi <span class="highlight">${userName}</span>,</p>
            <p>Congratulations! You have completed a Pomodoro focus session for task <span class="highlight">${taskTitle}</span>.</p>
            <p>You have now completed <span class="highlight">${currentCount}</span> focus sessions for this task. Keep up the great work! 🍅</p>
        `;
        await triggerEmail(workspaceId, email, `🍅 Pomodoro Complete: ${taskTitle}`, 'pomodoro_complete', body);
    }
}
