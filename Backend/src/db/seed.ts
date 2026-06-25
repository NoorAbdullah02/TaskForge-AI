import { db } from './index';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Clear existing data in correct dependency order
    console.log('🧹 Cleaning existing records...');
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

    // 2. Hash passwords
    console.log('🔑 Hashing passwords...');
    const hashedPassword = bcrypt.hashSync('password123', 10);

    // 3. Seed Users
    console.log('👤 Seeding users...');
    const users = (await db.insert(schema.users).values([
        {
            name: 'TaskForge Admin',
            email: 'admin@taskforge.ai',
            password: hashedPassword,
            isEmailVerified: true,
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
            role: 'admin',
            position: 'Administrator',
            phone: '+1 (555) 010-0001',
        },
        {
            name: 'Imran Khan',
            email: 'imran@taskforge.ai',
            password: hashedPassword,
            isEmailVerified: true,
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
            role: 'manager',
            position: 'Lead Architect',
            phone: '+1 (555) 010-0002',
        },
        {
            name: 'Noor Abdullah',
            email: 'noor@taskforge.ai',
            password: hashedPassword,
            isEmailVerified: true,
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
            role: 'employee',
            position: 'Software Engineer',
            phone: '+1 (555) 010-0003',
        },
        {
            name: 'Sarah Chen',
            email: 'sarah@taskforge.ai',
            password: hashedPassword,
            isEmailVerified: true,
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
            role: 'manager',
            position: 'Lead UI/UX Designer',
            phone: '+1 (555) 010-0004',
        }
    ]).returning()) as any;

    const [admin, imran, noor, sarah] = users;
    console.log(`✅ Seeded ${users.length} users.`);

    // 4. Seed Departments
    console.log('🏢 Seeding departments...');
    const depts = (await db.insert(schema.departments).values([
        {
            name: 'Product Management',
            description: 'Guides product lifecycle, planning, and roadmapping.',
            managerId: admin.id,
        },
        {
            name: 'Engineering',
            description: 'Software development, backend integration, devops.',
            managerId: imran.id,
        },
        {
            name: 'UI/UX Design',
            description: 'User research, wireframing, interface design.',
            managerId: sarah.id,
        }
    ]).returning()) as any;

    const [productDept, engineeringDept, designDept] = depts;
    console.log(`✅ Seeded ${depts.length} departments.`);

    // Link users to their departments
    console.log('🔗 Linking users to departments...');
    await db.update(schema.users).set({ departmentId: productDept.id }).where(eq(schema.users.id, admin.id));
    await db.update(schema.users).set({ departmentId: engineeringDept.id }).where(eq(schema.users.id, imran.id));
    await db.update(schema.users).set({ departmentId: engineeringDept.id }).where(eq(schema.users.id, noor.id));
    await db.update(schema.users).set({ departmentId: designDept.id }).where(eq(schema.users.id, sarah.id));
    console.log('✅ Linked users to departments successfully.');

    // 5. Seed Projects
    console.log('📁 Seeding projects...');
    const projects = (await db.insert(schema.projects).values([
        {
            name: 'TaskForge Core Platform',
            description: 'Development of the core enterprise dashboard, task flows, and user workspace.',
            departmentId: engineeringDept.id,
            status: 'in_progress',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-07-31'),
        },
        {
            name: 'AI Recommendation Engine',
            description: 'Machine Learning workflows for task complexity predictions and automated resource recommendations.',
            departmentId: productDept.id,
            status: 'planning',
            startDate: new Date('2026-06-15'),
            endDate: new Date('2026-08-31'),
        }
    ]).returning()) as any;

    const [coreProj, aiProj] = projects;
    console.log(`✅ Seeded ${projects.length} projects.`);

    // 6. Seed Project Members
    console.log('👥 Seeding project members...');
    await db.insert(schema.projectMembers).values([
        // Core Platform Members
        { projectId: coreProj.id, userId: admin.id, role: 'owner' },
        { projectId: coreProj.id, userId: imran.id, role: 'manager' },
        { projectId: coreProj.id, userId: noor.id, role: 'member' },
        // AI Project Members
        { projectId: aiProj.id, userId: admin.id, role: 'owner' },
        { projectId: aiProj.id, userId: sarah.id, role: 'manager' },
        { projectId: aiProj.id, userId: imran.id, role: 'member' },
        { projectId: aiProj.id, userId: noor.id, role: 'member' }
    ]);
    console.log('✅ Seeded project memberships.');

    // 7. Seed Tasks and Milestones
    console.log('📋 Seeding tasks and milestones...');
    const seededTasks = (await db.insert(schema.tasks).values([
        // Core Proj tasks
        {
            projectId: coreProj.id,
            title: 'Set up Next.js frontend structure',
            description: 'Setup initial workspace structure with Vite, React Query, and TailwindCSS.',
            status: 'done',
            priority: 'high',
            assigneeId: noor.id,
            isMilestone: false,
            dueDate: new Date('2026-06-10'),
        },
        {
            projectId: coreProj.id,
            title: 'Design relational schema in database',
            description: 'Create PostgreSQL tables for projects, tasks, attendance, and leave management.',
            status: 'done',
            priority: 'critical',
            assigneeId: imran.id,
            isMilestone: false,
            dueDate: new Date('2026-06-05'),
        },
        {
            projectId: coreProj.id,
            title: 'Integrate FastAPI prediction endpoints',
            description: 'Establish backend HTTP client communication with the FastAPI microservice on port 8000.',
            status: 'in-progress',
            priority: 'medium',
            assigneeId: noor.id,
            isMilestone: false,
            dueDate: new Date('2026-06-30'),
        },
        {
            projectId: coreProj.id,
            title: 'Add security checking to workspace routes',
            description: 'Implement backend router guards to check user session authorization and valid projects.',
            status: 'todo',
            priority: 'high',
            assigneeId: imran.id,
            isMilestone: false,
            dueDate: new Date('2026-07-05'),
        },
        {
            projectId: coreProj.id,
            title: 'Core Platform v1.0 Release Build',
            description: 'Milestone milestone containing initial dashboard metrics and basic task manager integrations.',
            status: 'todo',
            priority: 'critical',
            isMilestone: true,
            dueDate: new Date('2026-07-01'),
        },
        // AI Proj tasks
        {
            projectId: aiProj.id,
            title: 'Generate and pre-train XGBoost models',
            description: 'Execute generate_data.py and train_all.py scripts in FastAPI microservice folder.',
            status: 'done',
            priority: 'high',
            assigneeId: noor.id,
            isMilestone: false,
            dueDate: new Date('2026-06-20'),
        },
        {
            projectId: aiProj.id,
            title: 'Implement copilot dialogue history interface',
            description: 'Optimize gemini.ts controller to store past greetings and map alternate conversation roles.',
            status: 'in-progress',
            priority: 'medium',
            assigneeId: sarah.id,
            isMilestone: false,
            dueDate: new Date('2026-07-10'),
        },
        {
            projectId: aiProj.id,
            title: 'AI Services integration milestone',
            description: 'Deliver initial delay, attendance, and productivity predictions in user profiles and settings.',
            status: 'todo',
            priority: 'high',
            isMilestone: true,
            dueDate: new Date('2026-07-15'),
        }
    ]).returning()) as any;

    const [t1, t2] = seededTasks;
    console.log(`✅ Seeded ${seededTasks.length} tasks and milestones.`);

    // 8. Seed Subtasks
    console.log('✓ Seeding subtasks...');
    await db.insert(schema.subtasks).values([
        { taskId: t1.id, title: 'Install Vite plugins', isCompleted: true },
        { taskId: t1.id, title: 'Configure path aliases', isCompleted: true },
        { taskId: t1.id, title: 'Verify bundle imports', isCompleted: false },
        { taskId: t2.id, title: 'Write Drizzle migration script', isCompleted: true },
        { taskId: t2.id, title: 'Verify indexes on foreign keys', isCompleted: true }
    ]);
    console.log('✅ Seeded checklist items.');

    // 9. Seed Comments
    console.log('💬 Seeding comments...');
    await db.insert(schema.comments).values([
        {
            taskId: t1.id,
            userId: imran.id,
            content: 'Great progress Noor! Can you check if Rollup manual chunks splits three.js properly?',
        },
        {
            taskId: t1.id,
            userId: noor.id,
            content: 'Yes! Added Rollup vendor manual chunks to vite.config.js, compile looks very optimized now.',
        }
    ]);
    console.log('✅ Seeded comments.');

    // 10. Seed Leave Requests
    console.log('📅 Seeding leave requests...');
    await db.insert(schema.leaveRequests).values([
        {
            userId: noor.id,
            leaveType: 'Medical Leave',
            startDate: new Date('2026-06-10'),
            endDate: new Date('2026-06-12'),
            reason: 'Annual medical wellness checkup.',
            status: 'approved',
            approvedById: admin.id,
        },
        {
            userId: sarah.id,
            leaveType: 'Casual Leave',
            startDate: new Date('2026-06-20'),
            endDate: new Date('2026-06-21'),
            reason: 'Attending a close family wedding ceremony.',
            status: 'approved',
            approvedById: admin.id,
        },
        {
            userId: imran.id,
            leaveType: 'Annual Leave',
            startDate: new Date('2026-06-28'),
            endDate: new Date('2026-06-30'),
            reason: 'Short family vacation trip.',
            status: 'pending',
        }
    ]);
    console.log('✅ Seeded leave requests.');

    // 11. Seed Attendance records for current month (June 2026)
    console.log('⏰ Seeding attendance logs...');
    const attendanceLogs = [];
    const weekdaysInJune = [];

    // Local time is June 25, 2026. Seed weekdays up to June 25.
    for (let dayNum = 1; dayNum <= 25; dayNum++) {
        const dateObj = new Date(2026, 5, dayNum); // Month index 5 = June
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays only
            weekdaysInJune.push(dayNum);
        }
    }

    const testUsers = [admin, imran, noor, sarah];

    for (const user of testUsers) {
        for (const dayNum of weekdaysInJune) {
            const dateStr = `2026-06-${String(dayNum).padStart(2, '0')}`;
            
            // Random check-in statuses (mostly present, some late, rare absence)
            const roll = Math.random();
            let status = 'present';
            let checkInHour = 9;
            let checkInMinute = Math.floor(Math.random() * 20); // 09:00 - 09:19

            if (roll > 0.85) {
                status = 'late';
                checkInHour = 10;
                checkInMinute = Math.floor(Math.random() * 45); // 10:00 - 10:44
            } else if (roll > 0.97) {
                status = 'absent';
            }

            if (status === 'absent') {
                attendanceLogs.push({
                    userId: user.id,
                    date: dateStr,
                    status: 'absent',
                });
            } else {
                const checkInDate = new Date(2026, 5, dayNum, checkInHour, checkInMinute, 0);
                const checkOutDate = new Date(2026, 5, dayNum, 17, Math.floor(Math.random() * 30), 0); // 17:00 - 17:29
                
                attendanceLogs.push({
                    userId: user.id,
                    date: dateStr,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    status: status,
                    location: 'Office (HQ)',
                    ipAddress: `192.168.1.${10 + user.id}`,
                });
            }
        }
    }

    await db.insert(schema.attendance).values(attendanceLogs);
    console.log(`✅ Seeded ${attendanceLogs.length} attendance logs for June weekdays.`);

    // 12. Seed Activity Logs
    console.log('⚡ Seeding activity logs...');
    await db.insert(schema.activityLogs).values([
        { userId: admin.id, action: 'CREATE', entityType: 'project', entityId: coreProj.id, details: 'Created project TaskForge Core Platform' },
        { userId: imran.id, action: 'CREATE', entityType: 'task', entityId: t2.id, details: 'Created task Design relational schema in database' },
        { userId: noor.id, action: 'UPDATE', entityType: 'task', entityId: t1.id, details: 'Completed Next.js project setup' }
    ]);
    console.log('✅ Seeded activity logs.');

    // 13. Seed System Settings
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

    console.log('🎉 Database seeding completed successfully! All metrics are live.');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
});
