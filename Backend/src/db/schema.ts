import { relations } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp, integer, text, boolean } from "drizzle-orm/pg-core";
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
    is2faEnabled: boolean("is_2fa_enabled").notNull().default(false),
    otpCode: varchar("otp_code", { length: 8 }),
    otpExpiresAt: timestamp("otp_expires_at", { mode: "date" }),
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



// one user have multiple sessions 
export const usersRelation = relations(users, ({ many }) => ({
    session: many(sessionTable)
}))

export const sessionsRelation = relations(sessionTable, ({ one }) => ({
    user: one(users, {
        fields: [sessionTable.userId], // foreign key
        references: [users.id]
    })
}))





export type verify = typeof verifyEmailTable.$inferSelect;
export type newVerify = typeof verifyEmailTable.$inferInsert;

export type session = typeof sessionTable.$inferSelect;
export type newSession = typeof sessionTable.$inferInsert;

export type user = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;


export const departments = pgTable("departments", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    managerId: integer("manager_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});


export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    departmentId: integer("department_id").references(() => departments.id, { onDelete: 'set null' }),
    status: varchar("status", { length: 50 }).notNull().default("planning"),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
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
    assigneeId: integer("assignee_id").references(() => users.id, { onDelete: 'set null' }),
    isMilestone: boolean("is_milestone").notNull().default(false),
    dueDate: timestamp("due_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
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
    subtasks: many(subtasks),
    comments: many(comments),
    attachments: many(attachments)
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