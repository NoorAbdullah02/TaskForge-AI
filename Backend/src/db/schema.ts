import { relations } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp, integer, text, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    role: varchar("role", { length: 50 }).notNull().default("employee"),
    position: varchar("position", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    departmentId: integer("department_id"),
    teamId: integer("team_id").references((): any => teams.id, { onDelete: 'set null' }),
    shiftType: varchar("shift_type", { length: 50 }).notNull().default("morning"),
    is2faEnabled: boolean("is_2fa_enabled").notNull().default(false),
    otpCode: varchar("otp_code", { length: 8 }),
    otpExpiresAt: timestamp("otp_expires_at", { mode: "date" }),
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});




export const sessionTable = pgTable("sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    valid: boolean("valid").notNull().default(true),
    userAgent: text("user_agent"),
    ip: text("ip_address"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()

})



export const passwordResetTokenTable = pgTable("password_reset_tokens", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: varchar("token", { length: 8 }).notNull(),
    expiresAt: timestamp("expires_at", {
        mode: 'date',
        withTimezone: false,
    })
        .default(sql`CURRENT_TIMESTAMP + INTERVAL '15 minutes'`)
        .notNull(),

    createdAt: timestamp("created_at", {
        mode: 'date',
        withTimezone: false,
    }).defaultNow(),
});



export const verifyEmailTable = pgTable("verify_email", {
    id: serial("id").primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 8 }).notNull(),
    expiresAt: timestamp('expires_at', {
        mode: 'date',
        withTimezone: false,
    })
        .default(sql`CURRENT_TIMESTAMP + INTERVAL '15 minutes'`)
        .notNull(),

    createdAt: timestamp('created_at', {
        mode: 'date',
        withTimezone: false,
    }).defaultNow(),
});




export const usersRelation = relations(users, ({ one, many }) => ({
    session: many(sessionTable),
    team: one(teams, {
        fields: [users.teamId],
        references: [teams.id]
    }),
    skills: many(userSkills)
}))

export const sessionsRelation = relations(sessionTable, ({ one }) => ({
    user: one(users, {
        fields: [sessionTable.userId],
        references: [users.id]
    })
}))





export type verify = typeof verifyEmailTable.$inferSelect;
export type newVerify = typeof verifyEmailTable.$inferInsert;

export type session = typeof sessionTable.$inferSelect;
export type newSession = typeof sessionTable.$inferInsert;

export type user = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const workspaces = pgTable("workspaces", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    inviteCode: varchar("invite_code", { length: 50 }).notNull().unique(),
    inviteLink: varchar("invite_link", { length: 255 }).notNull(),
    ownerId: integer("owner_id").references((): any => users.id, { onDelete: 'set null' }),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    logo: varchar("logo", { length: 500 }),
    description: text("description"),
    password: varchar("password", { length: 255 }),
    timeZone: varchar("time_zone", { length: 100 }).notNull().default("UTC"),
    officeStart: varchar("office_start", { length: 50 }).notNull().default("09:00"),
    officeEnd: varchar("office_end", { length: 50 }).notNull().default("17:00"),
    workingDays: varchar("working_days", { length: 255 }).notNull().default("1,2,3,4,5"),
    holidays: text("holidays").notNull().default("[]"),
    leavePolicy: text("leave_policy").notNull().default('{"sick": 14, "casual": 10, "annual": 15}'),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" })
});

export const workspaceMembers = pgTable("workspace_members", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar("role", { length: 50 }).notNull().default("employee"),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull()
});

export const emailLogs = pgTable("email_logs", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: 'set null' }),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("sent"),
    errorMessage: text("error_message"),
    messageId: varchar("message_id", { length: 255 }),
    retryCount: integer("retry_count").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { mode: "date" }),
    sentAt: timestamp("sent_at", { mode: "date" }),
    userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
    htmlContent: text("html_content"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const departments = pgTable("departments", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    managerId: integer("manager_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    departmentId: integer("department_id").references(() => departments.id, { onDelete: 'set null' }),
    status: varchar("status", { length: 50 }).notNull().default("planning"),
    workTypes: text("work_types").notNull().default("task"),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    password: varchar("password", { length: 255 }),
    inviteCode: varchar("invite_code", { length: 50 }),
    inviteLink: varchar("invite_link", { length: 255 }),
    isArchived: boolean("is_archived").notNull().default(false),
    clonedFromId: integer("cloned_from_id").references((): any => projects.id, { onDelete: 'set null' }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" })
});

export const projectMembers = pgTable("project_members", {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar("role", { length: 50 }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull()
});


export const tasks = pgTable("tasks", {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("todo"),
    priority: varchar("priority", { length: 50 }).notNull().default("medium"),
    workType: varchar("work_type", { length: 50 }).notNull().default("task"),
    assigneeId: integer("assignee_id").references((): any => users.id, { onDelete: 'set null' }),
    isMilestone: boolean("is_milestone").notNull().default(false),
    dueDate: timestamp("due_date", { mode: "date" }),
    storyId: integer("story_id").references(() => stories.id, { onDelete: 'set null' }),
    sprintId: integer("sprint_id").references(() => sprints.id, { onDelete: 'set null' }),
    escalationLevel: integer("escalation_level").notNull().default(0),
    lastEscalatedAt: timestamp("last_escalated_at", { mode: "date" }),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrenceCron: varchar("recurrence_cron", { length: 100 }),
    lastRecurredAt: timestamp("last_recurred_at", { mode: "date" }),
    nextRecurrenceAt: timestamp("next_recurrence_at", { mode: "date" }),
    labels: text("labels"),
    category: varchar("category", { length: 100 }),
    estimatedHours: doublePrecision("estimated_hours"),
    actualHours: doublePrecision("actual_hours").notNull().default(0),
    isTimerActive: boolean("is_timer_active").notNull().default(false),
    timerStartedAt: timestamp("timer_started_at", { mode: "date" }),
    isLocked: boolean("is_locked").notNull().default(false),
    lockedById: integer("locked_by_id").references((): any => users.id, { onDelete: 'set null' }),
    isArchived: boolean("is_archived").notNull().default(false),
    pomodoroCount: integer("pomodoro_count").notNull().default(0),
    activePomodoroSession: boolean("active_pomodoro_session").notNull().default(false),
    pomodoroTimerStartedAt: timestamp("pomodoro_timer_started_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" })
});


export const subtasks = pgTable("subtasks", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});


export const comments = pgTable("comments", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const attachments = pgTable("attachments", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'set null' }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const projectDocuments = pgTable("project_documents", {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'set null' }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});


export const notifications = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    link: varchar("link", { length: 500 }),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: integer("entity_id"),
    actionType: varchar("action_type", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});


export const attendance = pgTable("attendance", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: varchar("date", { length: 50 }).notNull(),
    checkIn: timestamp("check_in", { mode: "date" }),
    checkOut: timestamp("check_out", { mode: "date" }),
    status: varchar("status", { length: 50 }).notNull().default("present"),
    location: varchar("location", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 50 })
});


export const leaveRequests = pgTable("leave_requests", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    leaveType: varchar("leave_type", { length: 100 }).notNull(),
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }).notNull(),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    approvedById: integer("approved_by_id").references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});


export const activityLogs = pgTable("activity_logs", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
    action: varchar("action", { length: 255 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: integer("entity_id"),
    details: text("details"),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});


export const aiRequests = pgTable("ai_requests", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    promptType: varchar("prompt_type", { length: 100 }).notNull(),
    promptText: text("prompt_text").notNull(),
    responseText: text("response_text").notNull(),
    tokensUsed: integer("tokens_used"),
    status: varchar("status", { length: 50 }).notNull().default("success"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const systemSettings = pgTable("system_settings", {
    id: serial("id").primaryKey(),
    orgName: varchar("org_name", { length: 255 }).notNull().default("TaskForge AI"),
    orgLogo: varchar("org_logo", { length: 500 }),
    timeZone: varchar("time_zone", { length: 100 }).notNull().default("UTC"),
    officeStart: varchar("office_start", { length: 50 }).notNull().default("09:00"),
    officeEnd: varchar("office_end", { length: 50 }).notNull().default("17:00"),
    workingDays: varchar("working_days", { length: 255 }).notNull().default("1,2,3,4,5"),
    holidays: text("holidays").notNull().default("[]"),
    leavePolicy: text("leave_policy").notNull().default('{"sick": 14, "casual": 10, "annual": 15}'),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const teams = pgTable("teams", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    leaderId: integer("leader_id").references((): any => users.id, { onDelete: 'set null' }),
    departmentId: integer("department_id").references(() => departments.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const epics = pgTable("epics", {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("planning"),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const stories = pgTable("stories", {
    id: serial("id").primaryKey(),
    epicId: integer("epic_id").notNull().references(() => epics.id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("todo"),
    points: integer("points").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const sprints = pgTable("sprints", {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    status: varchar("status", { length: 50 }).notNull().default("future"), // active, completed, future
    goal: text("goal"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});


export const departmentsRelations = relations(departments, ({ one, many }) => ({
    manager: one(users, {
        fields: [departments.managerId],
        references: [users.id]
    }),
    projects: many(projects)
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
    department: one(departments, {
        fields: [projects.departmentId],
        references: [departments.id]
    }),
    members: many(projectMembers),
    tasks: many(tasks)
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
    project: one(projects, {
        fields: [projectMembers.projectId],
        references: [projects.id]
    }),
    user: one(users, {
        fields: [projectMembers.userId],
        references: [users.id]
    })
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    project: one(projects, {
        fields: [tasks.projectId],
        references: [projects.id]
    }),
    assignee: one(users, {
        fields: [tasks.assigneeId],
        references: [users.id]
    }),
    story: one(stories, {
        fields: [tasks.storyId],
        references: [stories.id]
    }),
    sprint: one(sprints, {
        fields: [tasks.sprintId],
        references: [sprints.id]
    }),
    subtasks: many(subtasks),
    comments: many(comments),
    attachments: many(attachments),
    dependencies: many(taskDependencies, { relationName: "task_dependencies_taskId" }),
    dependents: many(taskDependencies, { relationName: "task_dependencies_dependsOnTaskId" })
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
    task: one(tasks, {
        fields: [subtasks.taskId],
        references: [tasks.id]
    })
}));

export const commentsRelations = relations(comments, ({ one }) => ({
    task: one(tasks, {
        fields: [comments.taskId],
        references: [tasks.id]
    }),
    user: one(users, {
        fields: [comments.userId],
        references: [users.id]
    })
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
    task: one(tasks, {
        fields: [attachments.taskId],
        references: [tasks.id]
    }),
    user: one(users, {
        fields: [attachments.userId],
        references: [users.id]
    })
}));

export const projectDocumentsRelations = relations(projectDocuments, ({ one }) => ({
    project: one(projects, {
        fields: [projectDocuments.projectId],
        references: [projects.id]
    }),
    user: one(users, {
        fields: [projectDocuments.userId],
        references: [users.id]
    })
}));


export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id]
    })
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
    user: one(users, {
        fields: [attendance.userId],
        references: [users.id]
    })
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
    user: one(users, {
        fields: [leaveRequests.userId],
        references: [users.id]
    }),
    approvedBy: one(users, {
        fields: [leaveRequests.approvedById],
        references: [users.id]
    })
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
    user: one(users, {
        fields: [activityLogs.userId],
        references: [users.id]
    })
}));

export const aiRequestsRelations = relations(aiRequests, ({ one }) => ({
    user: one(users, {
        fields: [aiRequests.userId],
        references: [users.id]
    })
}));


export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type NewProjectDocument = typeof projectDocuments.$inferInsert;


export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type AiRequest = typeof aiRequests.$inferSelect;
export type NewAiRequest = typeof aiRequests.$inferInsert;

export type SystemSettings = typeof systemSettings.$inferSelect;
export type NewSystemSettings = typeof systemSettings.$inferInsert;

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type Epic = typeof epics.$inferSelect;
export type NewEpic = typeof epics.$inferInsert;

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

export type Sprint = typeof sprints.$inferSelect;
export type NewSprint = typeof sprints.$inferInsert;

export const teamsRelations = relations(teams, ({ one, many }) => ({
    leader: one(users, {
        fields: [teams.leaderId],
        references: [users.id]
    }),
    department: one(departments, {
        fields: [teams.departmentId],
        references: [departments.id]
    }),
    members: many(users)
}));

export const epicsRelations = relations(epics, ({ one, many }) => ({
    project: one(projects, {
        fields: [epics.projectId],
        references: [projects.id]
    }),
    stories: many(stories)
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
    epic: one(epics, {
        fields: [stories.epicId],
        references: [epics.id]
    }),
    tasks: many(tasks)
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
    project: one(projects, {
        fields: [sprints.projectId],
        references: [projects.id]
    }),
    tasks: many(tasks)
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    owner: one(users, {
        fields: [workspaces.ownerId],
        references: [users.id]
    }),
    members: many(workspaceMembers),
    projects: many(projects),
    departments: many(departments),
    emailLogs: many(emailLogs),
    activityLogs: many(activityLogs)
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [workspaceMembers.workspaceId],
        references: [workspaces.id]
    }),
    user: one(users, {
        fields: [workspaceMembers.userId],
        references: [users.id]
    })
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [emailLogs.workspaceId],
        references: [workspaces.id]
    })
}));

export const taskDependencies = pgTable("task_dependencies", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    dependsOnTaskId: integer("depends_on_task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    dependencyType: varchar("dependency_type", { length: 50 }).notNull().default("FS"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const userSkills = pgTable("user_skills", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    skillName: varchar("skill_name", { length: 255 }).notNull(),
    proficiency: integer("proficiency").notNull().default(3), // 1 to 5
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
    task: one(tasks, {
        fields: [taskDependencies.taskId],
        references: [tasks.id],
        relationName: "task_dependencies_taskId"
    }),
    dependsOnTask: one(tasks, {
        fields: [taskDependencies.dependsOnTaskId],
        references: [tasks.id],
        relationName: "task_dependencies_dependsOnTaskId"
    })
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
    user: one(users, {
        fields: [userSkills.userId],
        references: [users.id]
    })
}));

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type NewTaskDependency = typeof taskDependencies.$inferInsert;

export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;

// ----------------- SaaS Enterprise Schema Extensions -----------------

export const chats = pgTable("chats", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }), // Room name for groups/teams/projects
    type: varchar("type", { length: 50 }).notNull().default("direct"), // direct, group, project, team
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const chatMembers = pgTable("chat_members", {
    id: serial("id").primaryKey(),
    chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull()
});

export const messages = pgTable("messages", {
    id: serial("id").primaryKey(),
    chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: 'cascade' }),
    senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const wikiPages = pgTable("wiki_pages", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 50 }).notNull().default("wiki"), // wiki, doc, note, sop
    createdById: integer("created_by_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const timeLogs = pgTable("time_logs", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: 'set null' }),
    description: text("description"),
    startTime: timestamp("start_time", { mode: "date" }).notNull(),
    endTime: timestamp("end_time", { mode: "date" }),
    duration: integer("duration"), // in seconds, excludes paused time
    status: varchar("status", { length: 20 }).notNull().default("running"), // running | paused | stopped
    pausedAt: timestamp("paused_at", { mode: "date" }),
    totalPausedSeconds: integer("total_paused_seconds").notNull().default(0),
    idleSeconds: integer("idle_seconds").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const meetings = pgTable("meetings", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { mode: "date" }).notNull(),
    endTime: timestamp("end_time", { mode: "date" }).notNull(),
    meetingLink: varchar("meeting_link", { length: 500 }),
    createdById: integer("created_by_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const fileVersions = pgTable("file_versions", {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull().references(() => projectDocuments.id, { onDelete: 'cascade' }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 100 }),
    version: integer("version").notNull().default(1),
    createdById: integer("created_by_id").references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const fileDownloads = pgTable("file_downloads", {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull().references(() => projectDocuments.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: text("user_agent"),
    downloadedAt: timestamp("downloaded_at", { mode: "date" }).defaultNow().notNull()
});

export const apiKeys = pgTable("api_keys", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { mode: "date" })
});

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type ChatMember = typeof chatMembers.$inferSelect;
export type NewChatMember = typeof chatMembers.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type WikiPage = typeof wikiPages.$inferSelect;
export type NewWikiPage = typeof wikiPages.$inferInsert;
export type TimeLog = typeof timeLogs.$inferSelect;
export type NewTimeLog = typeof timeLogs.$inferInsert;
export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type FileVersion = typeof fileVersions.$inferSelect;
export type NewFileVersion = typeof fileVersions.$inferInsert;
export type FileDownload = typeof fileDownloads.$inferSelect;
export type NewFileDownload = typeof fileDownloads.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export const taskWatchers = pgTable("task_watchers", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar("role", { length: 50 }).notNull().default("watcher"), // "watcher" or "follower"
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const taskTemplates = pgTable("task_templates", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: varchar("priority", { length: 50 }).default("medium"),
    workType: varchar("work_type", { length: 50 }).default("task"),
    estimatedHours: doublePrecision("estimated_hours"),
    labels: text("labels"),
    category: varchar("category", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const taskHistory = pgTable("task_history", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
    fieldName: varchar("field_name", { length: 100 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changeType: varchar("change_type", { length: 50 }).notNull(), // "create", "update", "delete", "status_change", "timer", "pomodoro"
    isUndone: boolean("is_undone").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export type TaskWatcher = typeof taskWatchers.$inferSelect;
export type NewTaskWatcher = typeof taskWatchers.$inferInsert;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;
export type TaskHistory = typeof taskHistory.$inferSelect;
export type NewTaskHistory = typeof taskHistory.$inferInsert;

export const notificationPreferences = pgTable("notification_preferences", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),
    reminderEnabled: boolean("reminder_enabled").notNull().default(true),
    taskAssign: boolean("task_assign").notNull().default(true),
    taskDeadline: boolean("task_deadline").notNull().default(true),
    taskComment: boolean("task_comment").notNull().default(true),
    leaveApproval: boolean("leave_approval").notNull().default(true),
    attendanceAlert: boolean("attendance_alert").notNull().default(true),
    projectUpdate: boolean("project_update").notNull().default(true),
    weeklyDigest: boolean("weekly_digest").notNull().default(true),
    monthlyReport: boolean("monthly_report").notNull().default(true),
    birthdayWish: boolean("birthday_wish").notNull().default(true)
});

export const automationLogs = pgTable("automation_logs", {
    id: serial("id").primaryKey(),
    jobType: varchar("job_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(), // "success", "failed"
    details: text("details"),
    ranAt: timestamp("ran_at", { mode: "date" }).defaultNow().notNull(),
    duration: integer("duration") // in milliseconds
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type AutomationLog = typeof automationLogs.$inferSelect;
export type NewAutomationLog = typeof automationLogs.$inferInsert;

// ----------------- Billing & Subscription -----------------
// amountCents is the amount in paisa (1 BDT = 100 paisa), matching integer-cents convention.

export const subscriptions = pgTable("subscriptions", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().unique().references(() => workspaces.id, { onDelete: 'cascade' }),
    plan: varchar("plan", { length: 50 }).notNull().default("free"), // free, pro, enterprise
    billingCycle: varchar("billing_cycle", { length: 20 }), // monthly, yearly
    status: varchar("status", { length: 50 }).notNull().default("trialing"), // trialing, active, past_due, expired, cancelled
    trialStartedAt: timestamp("trial_started_at", { mode: "date" }),
    trialEndsAt: timestamp("trial_ends_at", { mode: "date" }),
    currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const payments = pgTable("payments", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    submittedByUserId: integer("submitted_by_user_id").notNull().references(() => users.id, { onDelete: 'set null' }),
    plan: varchar("plan", { length: 50 }).notNull(), // pro, enterprise
    billingCycle: varchar("billing_cycle", { length: 20 }).notNull(), // monthly, yearly
    amountCents: integer("amount_cents").notNull(),
    method: varchar("method", { length: 20 }).notNull(), // bkash, nagad
    transactionId: varchar("transaction_id", { length: 100 }).notNull().unique(),
    senderNumber: varchar("sender_number", { length: 50 }).notNull(),
    screenshotUrl: varchar("screenshot_url", { length: 500 }),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, under_review, approved, rejected, expired, cancelled
    rejectionReason: text("rejection_reason"),
    reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const invoices = pgTable("invoices", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    paymentId: integer("payment_id").notNull().references(() => payments.id, { onDelete: 'cascade' }),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
    plan: varchar("plan", { length: 50 }).notNull(),
    billingCycle: varchar("billing_cycle", { length: 20 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    issuedAt: timestamp("issued_at", { mode: "date" }).defaultNow().notNull(),
    pdfUrl: varchar("pdf_url", { length: 500 })
});

export const billingHistory = pgTable("billing_history", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    type: varchar("type", { length: 50 }).notNull(), // trial_started, payment_submitted, payment_approved, payment_rejected, subscription_renewed, subscription_cancelled, plan_upgraded, plan_downgraded
    description: text("description").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const subscriptionLogs = pgTable("subscription_logs", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    subscriptionId: integer("subscription_id").references(() => subscriptions.id, { onDelete: 'set null' }),
    action: varchar("action", { length: 100 }).notNull(),
    performedByUserId: integer("performed_by_user_id").references(() => users.id, { onDelete: 'set null' }),
    previousPlan: varchar("previous_plan", { length: 50 }),
    newPlan: varchar("new_plan", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [subscriptions.workspaceId],
        references: [workspaces.id]
    })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [payments.workspaceId],
        references: [workspaces.id]
    }),
    submittedBy: one(users, {
        fields: [payments.submittedByUserId],
        references: [users.id]
    }),
    reviewedBy: one(users, {
        fields: [payments.reviewedByUserId],
        references: [users.id]
    })
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [invoices.workspaceId],
        references: [workspaces.id]
    }),
    payment: one(payments, {
        fields: [invoices.paymentId],
        references: [payments.id]
    })
}));

export const billingHistoryRelations = relations(billingHistory, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [billingHistory.workspaceId],
        references: [workspaces.id]
    })
}));

export const subscriptionLogsRelations = relations(subscriptionLogs, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [subscriptionLogs.workspaceId],
        references: [workspaces.id]
    }),
    subscription: one(subscriptions, {
        fields: [subscriptionLogs.subscriptionId],
        references: [subscriptions.id]
    })
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type BillingHistory = typeof billingHistory.$inferSelect;
export type NewBillingHistory = typeof billingHistory.$inferInsert;
export type SubscriptionLog = typeof subscriptionLogs.$inferSelect;

// ----------------- Daily Work Log -----------------

export const workLogs = pgTable("work_logs", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: 'set null' }),
    projectId: integer("project_id").references(() => projects.id, { onDelete: 'set null' }),
    logDate: varchar("log_date", { length: 20 }).notNull(), // YYYY-MM-DD
    startTime: varchar("start_time", { length: 10 }),
    endTime: varchar("end_time", { length: 10 }),
    hoursWorked: doublePrecision("hours_worked").notNull().default(0),
    progressPercent: integer("progress_percent").notNull().default(0),
    description: text("description").notNull(),
    challenges: text("challenges"),
    tomorrowPlan: text("tomorrow_plan"),
    gitCommitUrl: varchar("git_commit_url", { length: 500 }),
    status: varchar("status", { length: 30 }).notNull().default("pending"), // pending, approved, rejected, changes_requested
    reviewedByUserId: integer("reviewed_by_user_id").references((): any => users.id, { onDelete: 'set null' }),
    reviewNote: text("review_note"),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const workLogAttachments = pgTable("work_log_attachments", {
    id: serial("id").primaryKey(),
    workLogId: integer("work_log_id").notNull().references(() => workLogs.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'set null' }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});

export const workLogsRelations = relations(workLogs, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [workLogs.workspaceId],
        references: [workspaces.id]
    }),
    user: one(users, {
        fields: [workLogs.userId],
        references: [users.id]
    }),
    task: one(tasks, {
        fields: [workLogs.taskId],
        references: [tasks.id]
    }),
    project: one(projects, {
        fields: [workLogs.projectId],
        references: [projects.id]
    }),
    reviewedBy: one(users, {
        fields: [workLogs.reviewedByUserId],
        references: [users.id]
    }),
    attachments: many(workLogAttachments)
}));

export const workLogAttachmentsRelations = relations(workLogAttachments, ({ one }) => ({
    workLog: one(workLogs, {
        fields: [workLogAttachments.workLogId],
        references: [workLogs.id]
    })
}));

export type WorkLog = typeof workLogs.$inferSelect;
export type NewWorkLog = typeof workLogs.$inferInsert;
export type WorkLogAttachment = typeof workLogAttachments.$inferSelect;
export type NewWorkLogAttachment = typeof workLogAttachments.$inferInsert;
export type NewSubscriptionLog = typeof subscriptionLogs.$inferInsert;

// ----------------- Timesheet -----------------

export const timesheets = pgTable("timesheets", {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly
    periodStart: varchar("period_start", { length: 20 }).notNull(), // YYYY-MM-DD
    periodEnd: varchar("period_end", { length: 20 }).notNull(), // YYYY-MM-DD
    totalHours: doublePrecision("total_hours").notNull().default(0),
    billableHours: doublePrecision("billable_hours").notNull().default(0),
    workLogCount: integer("work_log_count").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("draft"), // draft, submitted, approved, rejected
    isLocked: boolean("is_locked").notNull().default(false),
    submittedAt: timestamp("submitted_at", { mode: "date" }),
    reviewedByUserId: integer("reviewed_by_user_id").references((): any => users.id, { onDelete: 'set null' }),
    reviewNote: text("review_note"),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
    workspace: one(workspaces, { fields: [timesheets.workspaceId], references: [workspaces.id] }),
    user: one(users, { fields: [timesheets.userId], references: [users.id] }),
    reviewedBy: one(users, { fields: [timesheets.reviewedByUserId], references: [users.id] })
}));

export type Timesheet = typeof timesheets.$inferSelect;
export type NewTimesheet = typeof timesheets.$inferInsert;