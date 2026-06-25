import { relations } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp, integer, text, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
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