import { db } from './index';
import * as schema from './schema';

async function main() {
    console.log('🌱 Starting clean database seeding...');

    // 1. Clear existing data in correct dependency order
    console.log('🧹 Cleaning all existing records...');
    await db.delete(schema.activityLogs);
    await db.delete(schema.aiRequests);
    await db.delete(schema.notifications);
    await db.delete(schema.attachments);
    await db.delete(schema.comments);
    await db.delete(schema.subtasks);
    await db.delete(schema.tasks);
    await db.delete(schema.projectDocuments);
    await db.delete(schema.projectMembers);
    await db.delete(schema.projects);
    await db.delete(schema.departments);
    await db.delete(schema.attendance);
    await db.delete(schema.leaveRequests);
    await db.delete(schema.verifyEmailTable);
    await db.delete(schema.passwordResetTokenTable);
    await db.delete(schema.sessionTable);
    await db.delete(schema.users);
    await db.delete(schema.systemSettings);
    console.log('✅ Clean complete.');

    // 2. Seed Default System Settings
    console.log('⚙️ Seeding default system settings...');
    await db.insert(schema.systemSettings).values({
        orgName: 'TaskForge AI',
        timeZone: 'UTC',
        officeStart: '09:00',
        officeEnd: '17:00',
        workingDays: '1,2,3,4,5',
        holidays: JSON.stringify([
            { name: "New Year's Day", date: "2026-01-01" },
            { name: "Independence Day", date: "2026-07-04" },
            { name: "Christmas Day", date: "2026-12-25" }
        ]),
        leavePolicy: JSON.stringify({ sick: 14, casual: 10, annual: 15 })
    });
    console.log('✅ Seeded system settings.');

    console.log('🎉 Database seeding completed successfully! Clean workspace is ready.');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
});
