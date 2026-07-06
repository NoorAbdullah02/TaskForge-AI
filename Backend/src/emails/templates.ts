import { getBaseTemplate } from './base.template';

export class EmailTemplates {
  // 1. Task Assigned
  static taskAssigned(
    userName: string,
    taskTitle: string,
    projectName: string,
    priority: string,
    estimatedHours: number | null,
    link: string
  ): string {
    const priorityColor = priority.toLowerCase() === 'high' ? 'badge-red' : priority.toLowerCase() === 'medium' ? 'badge-purple' : 'badge-blue';
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">You have been assigned a new task on TaskForge AI. Please review the details below:</p>

      <div class="card">
        <h3 class="card-title">${taskTitle}</h3>
        <div class="info-row">
          <span class="info-label">Project</span>
          <span class="info-value">${projectName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Priority</span>
          <span class="info-value"><span class="badge ${priorityColor}">${priority}</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">Estimated Time</span>
          <span class="info-value">${estimatedHours ? `${estimatedHours} hours` : 'Not specified'}</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">View Task details</a>
      </div>
    `;
    return getBaseTemplate(`Task Assigned: ${taskTitle}`, `Task Assigned: ${taskTitle}`, body);
  }

  // 2. Task Deadline Reminder
  static taskDeadline(
    userName: string,
    taskTitle: string,
    projectName: string,
    dueDate: string,
    daysLeft: number,
    link: string
  ): string {
    const daysText = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">This is a reminder that an assigned task is approaching its deadline ${daysText}:</p>

      <div class="card" style="border: 1px solid #fecaca;">
        <h3 class="card-title" style="color: #dc2626;">⚠️ ${taskTitle}</h3>
        <div class="info-row">
          <span class="info-label">Project</span>
          <span class="info-value">${projectName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Due Date</span>
          <span class="info-value" style="color: #dc2626; font-weight: 700;">${dueDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time Remaining</span>
          <span class="info-value">${daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button" style="background-color: #dc2626;">Open Task Hub</a>
      </div>
    `;
    return getBaseTemplate(`Deadline Alert: ${taskTitle}`, `Deadline Alert: ${taskTitle}`, body);
  }

  // 3. Task Completed
  static taskCompleted(
    userName: string,
    taskTitle: string,
    projectName: string,
    completedByName: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Great news! A task you are watching or assigned to has been marked as completed:</p>

      <div class="card">
        <h3 class="card-title" style="text-decoration: line-through; color: #64748b;">✅ ${taskTitle}</h3>
        <div class="info-row">
          <span class="info-label">Project</span>
          <span class="info-value">${projectName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed By</span>
          <span class="info-value">${completedByName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value"><span class="badge badge-green">Done</span></span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Inspect Task</a>
      </div>
    `;
    return getBaseTemplate(`Task Completed: ${taskTitle}`, `Task Completed: ${taskTitle}`, body);
  }

  // 4. Task Comment
  static taskComment(
    userName: string,
    taskTitle: string,
    commentText: string,
    authorName: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text"><span style="color: #0f172a; font-weight: 600;">${authorName}</span> added a new comment to your task:</p>

      <div class="card">
        <h3 class="card-title">${taskTitle}</h3>
        <div style="background-color: #f1f5f9; border-left: 3px solid #7c3aed; padding: 12px 16px; border-radius: 8px; font-style: italic; color: #334155; font-size: 14px; margin-top: 10px;">
          "${commentText}"
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Reply to Comment</a>
      </div>
    `;
    return getBaseTemplate(`New Comment on: ${taskTitle}`, `New Comment on: ${taskTitle}`, body);
  }

  // 5. Project Created
  static projectCreated(
    userName: string,
    projectName: string,
    workspaceName: string,
    description: string | null,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">A new project has been initiated in your workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span>:</p>

      <div class="card">
        <h3 class="card-title" style="color: #2563eb;">🚀 ${projectName}</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 10px 0 0 0;">
          ${description || 'No description provided.'}
        </p>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Access Project Hub</a>
      </div>
    `;
    return getBaseTemplate(`New Project Initiated: ${projectName}`, `New Project Initiated: ${projectName}`, body);
  }

  // 5a. Project Manager Assigned
  static projectManagerAssigned(
    userName: string,
    projectName: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">You have been officially appointed as the <span style="color: #0f172a; font-weight: 600;">Project Manager</span> for project <span style="color: #2563eb; font-weight: 600;">${projectName}</span>.</p>
      <p class="text">You now have access to manage timelines, update statuses, assign tasks, and track team progress on this project.</p>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Go to Project Hub</a>
      </div>
    `;
    return getBaseTemplate(`Appointed PM for ${projectName}`, `Appointed PM for ${projectName}`, body);
  }

  // 5b. Project Member Assigned
  static projectAssignment(
    userName: string,
    projectName: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">You have been assigned as a member of the project <span style="color: #0f172a; font-weight: 600;">${projectName}</span>.</p>
      <p class="text">You can now view project milestones, join discussions, and execute assigned tasks.</p>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">View Project Details</a>
      </div>
    `;
    return getBaseTemplate(`Assigned to Project: ${projectName}`, `Assigned to Project: ${projectName}`, body);
  }

  // 6. Project Anniversary
  static projectAnniversary(
    userName: string,
    projectName: string,
    years: number,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Happy Project Anniversary! 🎉</p>
      <p class="text">Today marks exactly <span style="color: #d97706; font-weight: 700;">${years} ${years === 1 ? 'year' : 'years'}</span> since project <span style="color: #0f172a; font-weight: 600;">${projectName}</span> was initiated. Thank you for your continued dedication to this project's success!</p>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button" style="background-color: #d97706;">Visit Project Dashboard</a>
      </div>
    `;
    return getBaseTemplate(`Project Anniversary: ${projectName}`, `Project Anniversary: ${projectName}`, body);
  }

  // 7. Leave Request
  static leaveRequest(
    managerName: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    reason: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${managerName},</h2>
      <p class="text"><span style="color: #0f172a; font-weight: 600;">${employeeName}</span> has submitted a new leave application that requires your approval:</p>

      <div class="card">
        <h3 class="card-title">Leave Details</h3>
        <div class="info-row">
          <span class="info-label">Leave Type</span>
          <span class="info-value"><span class="badge badge-purple">${leaveType}</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">Duration</span>
          <span class="info-value">${startDate} to ${endDate}</span>
        </div>
        <div style="margin-top: 10px;">
          <span class="info-label" style="display: block; margin-bottom: 4px;">Reason:</span>
          <span class="info-value" style="color: #475569; font-style: italic; font-weight: normal; display: block; text-align: left;">"${reason}"</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Review Leave Request</a>
      </div>
    `;
    return getBaseTemplate(`New Leave Application: ${employeeName}`, `New Leave Application: ${employeeName}`, body);
  }

  // 8. Leave Approved
  static leaveApproved(
    userName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    approvedBy: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Your leave application has been approved! 🎉</p>

      <div class="card" style="border: 1px solid #a7f3d0;">
        <h3 class="card-title" style="color: #059669;">✅ Application Approved</h3>
        <div class="info-row">
          <span class="info-label">Leave Type</span>
          <span class="info-value">${leaveType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dates</span>
          <span class="info-value">${startDate} to ${endDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Approved By</span>
          <span class="info-value">${approvedBy}</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">View Leave Calendar</a>
      </div>
    `;
    return getBaseTemplate(`Leave Request Approved`, `Leave Request Approved`, body);
  }

  // 9. Leave Rejected
  static leaveRejected(
    userName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    rejectedBy: string,
    reason: string | null,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Unfortunately, your leave application has not been approved at this time:</p>

      <div class="card" style="border: 1px solid #fecaca;">
        <h3 class="card-title" style="color: #dc2626;">❌ Application Declined</h3>
        <div class="info-row">
          <span class="info-label">Leave Type</span>
          <span class="info-value">${leaveType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dates</span>
          <span class="info-value">${startDate} to ${endDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Reviewed By</span>
          <span class="info-value">${rejectedBy}</span>
        </div>
        <div style="margin-top: 10px;">
          <span class="info-label" style="display: block; margin-bottom: 4px;">Reason:</span>
          <span class="info-value" style="color: #dc2626; font-weight: normal; display: block; text-align: left;">"${reason || 'No reason provided.'}"</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">View Leave Panel</a>
      </div>
    `;
    return getBaseTemplate(`Leave Request Rejected`, `Leave Request Rejected`, body);
  }

  // 10. Attendance Reminder
  static attendanceReminder(
    userName: string,
    date: string,
    shiftType: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">We noticed that you have not checked in for your shift today (<span style="color: #0f172a; font-weight: 600;">${date}</span>) yet.</p>

      <div class="card" style="border: 1px dashed #fca5a5; background-color: #fef2f2;">
        <h3 class="card-title" style="color: #dc2626; text-align: center; margin-bottom: 8px;">Check-In Reminder</h3>
        <p style="color: #475569; font-size: 14px; text-align: center; margin: 0;">
          Your current shift type is: <strong style="color: #0f172a;">${shiftType}</strong>. Please check in on the dashboard as soon as possible to avoid attendance flags.
        </p>
      </div>
    `;
    return getBaseTemplate(`Attendance Reminder`, `Attendance Reminder`, body);
  }

  // 11. Attendance Report
  static attendanceReport(
    userName: string,
    date: string,
    presentCount: number,
    lateCount: number,
    absentCount: number,
    detailsHtml: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Here is the Workspace Attendance Summary for <span style="color: #0f172a; font-weight: 600;">${date}</span>:</p>

      <div class="card">
        <div class="info-row">
          <span class="info-label">Present</span>
          <span class="info-value" style="color: #059669; font-weight: 700;">${presentCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Late Arrivals</span>
          <span class="info-value" style="color: #d97706; font-weight: 700;">${lateCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Absent / Missed</span>
          <span class="info-value" style="color: #dc2626; font-weight: 700;">${absentCount}</span>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Detailed Statuses</h3>
        <div style="font-size: 13px; line-height: 1.6; color: #475569;">
          ${detailsHtml}
        </div>
      </div>
    `;
    return getBaseTemplate(`Workspace Attendance Report: ${date}`, `Workspace Attendance Report: ${date}`, body);
  }

  // 12. Daily Summary
  static dailySummary(
    userName: string,
    activeTasksHtml: string,
    overdueTasksHtml: string
  ): string {
    const body = `
      <h2 class="greeting">Good Morning ${userName},</h2>
      <p class="text">Here is your personal TaskForge AI productivity digest for today:</p>

      ${overdueTasksHtml ? `
        <div class="card" style="border: 1px solid #fecaca;">
          <h3 class="card-title" style="color: #dc2626;">⚠️ Overdue Tasks</h3>
          <div style="font-size: 14px; line-height: 1.5;">
            ${overdueTasksHtml}
          </div>
        </div>
      ` : ''}

      <div class="card">
        <h3 class="card-title" style="color: #4f46e5;">📋 Active & Pending Tasks</h3>
        <div style="font-size: 14px; line-height: 1.5;">
          ${activeTasksHtml || '<p style="color: #94a3b8; font-style: italic; margin: 0;">No active tasks assigned to you currently.</p>'}
        </div>
      </div>
    `;
    return getBaseTemplate(`Your Daily Task Digest`, `Your Daily Task Digest`, body);
  }

  // 13. Weekly Report
  static weeklyReport(
    userName: string,
    workspaceName: string,
    completedCount: number,
    createdCount: number,
    openCount: number,
    detailsHtml: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Here is the Weekly Productivity Insights Report for workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span>:</p>

      <div class="card">
        <h3 class="card-title" style="color: #7c3aed;">📊 Productivity Metrics</h3>
        <div class="info-row">
          <span class="info-label">Completed Tasks</span>
          <span class="info-value" style="color: #059669; font-weight: 700;">${completedCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">New Tasks Created</span>
          <span class="info-value" style="color: #2563eb; font-weight: 700;">${createdCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Current Open Tasks</span>
          <span class="info-value" style="color: #7c3aed; font-weight: 700;">${openCount}</span>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Activity Insights</h3>
        <div style="font-size: 13px; line-height: 1.6; color: #475569;">
          ${detailsHtml}
        </div>
      </div>
    `;
    return getBaseTemplate(`Weekly Workspace Report: ${workspaceName}`, `Weekly Workspace Report: ${workspaceName}`, body);
  }

  // 14. Monthly Report
  static monthlyReport(
    userName: string,
    workspaceName: string,
    completedCount: number,
    createdCount: number,
    activeCount: number,
    detailsHtml: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Here is the Monthly Performance & Analytics Report for workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span>:</p>

      <div class="card">
        <h3 class="card-title" style="color: #db2777;">📈 Monthly Overview</h3>
        <div class="info-row">
          <span class="info-label">Total Completed Tasks</span>
          <span class="info-value" style="color: #059669; font-weight: 700;">${completedCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">New Tasks Logged</span>
          <span class="info-value" style="color: #2563eb; font-weight: 700;">${createdCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Average Open Tasks</span>
          <span class="info-value" style="color: #db2777; font-weight: 700;">${activeCount}</span>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Monthly Workspace Insights</h3>
        <div style="font-size: 13px; line-height: 1.6; color: #475569;">
          ${detailsHtml}
        </div>
      </div>
    `;
    return getBaseTemplate(`Monthly Workspace Report: ${workspaceName}`, `Monthly Workspace Report: ${workspaceName}`, body);
  }

  // 15. Birthday Wish
  static birthdayWish(userName: string): string {
    const body = `
      <h2 class="greeting" style="text-align: center; font-size: 24px; color: #d97706; margin-top: 10px;">🎂 Happy Birthday, ${userName}! 🎂</h2>
      <p class="text" style="text-align: center; font-size: 16px;">
        On behalf of the entire TaskForge AI team, we wish you a fantastic birthday filled with happiness, success, and great achievements. Have a wonderful day off or celebration! 🎉🎁
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 64px;">🎈🎂🥳</span>
      </div>
    `;
    return getBaseTemplate(`Happy Birthday, ${userName}!`, `Happy Birthday, ${userName}!`, body);
  }

  // 16. Workspace Invite
  static workspaceInvite(
    workspaceName: string,
    inviteLink: string
  ): string {
    const body = `
      <h2 class="greeting">Hello!</h2>
      <p class="text">You have been invited to join the enterprise workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span> on TaskForge AI.</p>

      <div class="card" style="text-align: center; padding: 24px;">
        <p style="color: #475569; font-size: 14px; margin-top: 0; margin-bottom: 20px;">
          Click the link below to accept the invitation, verify your account, and join the collaboration workspace.
        </p>
        <div class="cta-wrapper" style="margin-bottom: 0;">
          <a href="${inviteLink}" class="cta-button">Join Workspace Now</a>
        </div>
      </div>
    `;
    return getBaseTemplate(`Invitation to Join ${workspaceName}`, `Invitation to Join ${workspaceName}`, body);
  }

  // 17. Workspace Inactivity Reminder
  static workspaceReminder(
    userName: string,
    workspaceName: string,
    inactiveDays: number,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Your workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span> has had no task updates or check-ins for the last <span style="color: #d97706; font-weight: 700;">${inactiveDays} days</span>.</p>

      <div class="card" style="border: 1px solid #fde68a; background-color: #fffbeb;">
        <h3 class="card-title" style="color: #d97706;">⚠️ Inactivity Alert</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">
          To keep your teams engaged and projects moving forward, log in and review your open sprints, allocate pending backlogs, or check-in on team progress.
        </p>
      </div>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button" style="background-color: #d97706;">Launch Workspace</a>
      </div>
    `;
    return getBaseTemplate(`Inactivity Alert: ${workspaceName}`, `Inactivity Alert: ${workspaceName}`, body);
  }

  // 18. Workspace Created
  static workspaceCreated(
    userName: string,
    workspaceName: string,
    link: string,
    inviteCode?: string,
    inviteLink?: string
  ): string {
    let body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Congratulations! Your enterprise workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span> has been successfully set up and is ready for use.</p>
      <p class="text">You are registered as the Workspace Owner. You can now invite your team members, configure departments, and establish your first project pipelines.</p>
    `;

    if (inviteLink) {
      body += `
        <div class="card" style="border: 1px solid #c7d2fe; background-color: #eef2ff; margin-bottom: 20px;">
          <h3 class="card-title" style="color: #4338ca; margin-bottom: 12px;">👥 Share & Invite Your Team</h3>
          <p class="text" style="font-size: 13px; color: #475569; margin-bottom: 12px; margin-top: 0;">Share these details with others to let them join your workspace:</p>
          <div class="info-row" style="margin-bottom: 8px;">
            <span class="info-label" style="color: #64748b;">Invitation Code</span>
            <span class="info-value" style="font-family: monospace; font-size: 14px; background-color: #ffffff; border: 1px solid #c7d2fe; padding: 4px 8px; border-radius: 6px; color: #b45309; font-weight: bold;">${inviteCode}</span>
          </div>
          <div class="info-row">
            <span class="info-label" style="color: #64748b;">Direct Share URL</span>
            <span class="info-value" style="word-break: break-all; font-size: 12px;"><a href="${inviteLink}" style="color: #4f46e5; text-decoration: underline; font-weight: 600;">${inviteLink}</a></span>
          </div>
        </div>
      `;
    }

    body += `
      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Go to Workspace Console</a>
      </div>
    `;
    return getBaseTemplate(`Workspace ${workspaceName} Created`, `Workspace ${workspaceName} Created`, body);
  }

  // 19. Workspace Join Request
  static workspaceJoinRequest(
    ownerName: string,
    requesterName: string,
    requesterEmail: string,
    workspaceName: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${ownerName},</h2>
      <p class="text"><span style="color: #0f172a; font-weight: 600;">${requesterName}</span> (${requesterEmail}) has requested to join your workspace <span style="color: #2563eb; font-weight: 600;">${workspaceName}</span>.</p>
      <p class="text">Please review their application and take action (Approve/Reject) in the members panel.</p>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Review Access Request</a>
      </div>
    `;
    return getBaseTemplate(`Access Request: ${workspaceName}`, `Access Request: ${workspaceName}`, body);
  }

  // 20. Workspace Approval
  static workspaceApproval(
    userName: string,
    workspaceName: string,
    link: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Good news! Your request to join the workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span> has been approved. 🎉</p>
      <p class="text">You can now access the workspace dashboard, view active boards, and collaborate with your team.</p>

      <div class="cta-wrapper">
        <a href="${link}" class="cta-button">Enter Workspace</a>
      </div>
    `;
    return getBaseTemplate(`Welcome to ${workspaceName}!`, `Welcome to ${workspaceName}!`, body);
  }

  // 21. Workspace Rejection
  static workspaceRejection(
    userName: string,
    workspaceName: string
  ): string {
    const body = `
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="text">Unfortunately, your request to join workspace <span style="color: #0f172a; font-weight: 600;">${workspaceName}</span> was not approved at this time.</p>
      <p class="text">If you think this is an error or would like to appeal, please reach out to your workspace administrator or owner directly.</p>
    `;
    return getBaseTemplate(`Access Request Status: ${workspaceName}`, `Access Request Status: ${workspaceName}`, body);
  }
}
