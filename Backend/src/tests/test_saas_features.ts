import { db } from '../db/index';
import { users, workspaces, projects, tasks, chats, messages, wikiPages, timeLogs, meetings } from '../db/schema';
import { eq } from 'drizzle-orm';

async function runTests() {
    console.log('🏁 Running SaaS Platform Verification Tests...');

    try {
        // 1. Create a dummy test user and workspace
        console.log('🧪 Creating test data...');
        
        const [testUser] = await db.insert(users).values({
            name: 'Verification Bot',
            email: `verify-bot-${Date.now()}@taskforge.ai`,
            password: 'hashedpassword123',
            role: 'employee',
            isEmailVerified: true,
            updatedAt: new Date()
        }).returning();

        const [testWorkspace] = await db.insert(workspaces).values({
            name: 'Verification Hub',
            slug: `verify-slug-${Date.now()}`,
            inviteCode: `verify-invite-${Date.now()}`,
            inviteLink: `http://localhost/join/verify-${Date.now()}`,
            ownerId: testUser.id,
            updatedAt: new Date()
        }).returning();

        console.log(`✅ Test User (ID: ${testUser.id}) and Workspace (ID: ${testWorkspace.id}) created.`);

        // 2. Test User Banning
        console.log('🧪 Testing User Banning...');
        await db.update(users).set({ role: 'banned' }).where(eq(users.id, testUser.id));
        const [bannedUser] = await db.select().from(users).where(eq(users.id, testUser.id));
        if (bannedUser.role !== 'banned') {
            throw new Error('❌ Banned role status modification failed');
        }
        console.log('✅ User Banning works correctly.');

        // Restore role
        await db.update(users).set({ role: 'employee' }).where(eq(users.id, testUser.id));

        // 3. Test project and task cascade deletes on workspace reset
        console.log('🧪 Testing Workspace Reset Cascade...');
        const [testProject] = await db.insert(projects).values({
            workspaceId: testWorkspace.id,
            name: 'SaaS Project Verify',
            status: 'planning',
            updatedAt: new Date()
        }).returning();

        const [testTask] = await db.insert(tasks).values({
            projectId: testProject.id,
            title: 'SaaS Task Verify',
            status: 'todo',
            updatedAt: new Date()
        }).returning();

        console.log(`✅ Created test project (ID: ${testProject.id}) and task (ID: ${testTask.id}).`);

        // Perform cascading delete check by resetting workspace
        await db.delete(projects).where(eq(projects.workspaceId, testWorkspace.id));
        
        const remainingProjects = await db.select().from(projects).where(eq(projects.id, testProject.id));
        const remainingTasks = await db.select().from(tasks).where(eq(tasks.id, testTask.id));

        if (remainingProjects.length > 0 || remainingTasks.length > 0) {
            throw new Error('❌ Workspace projects/tasks cascade deletion failed on reset');
        }
        console.log('✅ Workspace Reset Cascade (Cascade delete) works correctly.');

        // 4. Test Chat Room & Message Logs
        console.log('🧪 Testing Chat Hub Persistence...');
        const [testChat] = await db.insert(chats).values({
            workspaceId: testWorkspace.id,
            name: 'Support Room',
            type: 'group',
            createdAt: new Date()
        }).returning();

        const [testMsg] = await db.insert(messages).values({
            chatId: testChat.id,
            senderId: testUser.id,
            content: 'Hello, testing socket and db transmission.',
            createdAt: new Date()
        }).returning();

        console.log(`✅ Chat room created (ID: ${testChat.id}) and message saved (ID: ${testMsg.id}).`);

        // Cleanup test data
        console.log('🧹 Cleaning up test data...');
        await db.delete(chats).where(eq(chats.id, testChat.id));
        await db.delete(workspaces).where(eq(workspaces.id, testWorkspace.id));
        await db.delete(users).where(eq(users.id, testUser.id));
        console.log('✅ Cleanup complete.');

        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Verification Tests Failed:', err);
        process.exit(1);
    }
}

runTests();
