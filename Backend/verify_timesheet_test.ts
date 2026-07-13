import { db } from './src/db';
import { users, workspaceMembers } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const [owner] = await db.select().from(users).where(eq(users.email, 'timesheet.owner.test@example.com')).limit(1);
  const [employee] = await db.select().from(users).where(eq(users.email, 'timesheet.employee.test@example.com')).limit(1);

  console.log('owner:', owner?.id, owner?.isEmailVerified);
  console.log('employee:', employee?.id, employee?.isEmailVerified);

  if (owner) await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, owner.id));
  if (employee) await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, employee.id));

  if (employee) {
    const [membership] = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, employee.id)).limit(1);
    console.log('employee membership status:', membership?.status, membership?.role);
  }

  console.log('Verification flip complete.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });


