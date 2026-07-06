import { BaseRepository } from './base.repository';
import { notifications } from '../db/schema';
import { db } from '../db';
import { eq, and, count, inArray } from 'drizzle-orm';

export class NotificationRepository extends BaseRepository<typeof notifications> {
  constructor() {
    super(notifications);
  }

  async findByUser(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      isRead?: boolean;
      isArchived?: boolean;
      type?: string;
      search?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));

    const conditions = [eq(notifications.userId, userId)];

    if (options.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, options.isRead));
    }
    if (options.isArchived !== undefined) {
      conditions.push(eq(notifications.isArchived, options.isArchived));
    }
    if (options.type) {
      conditions.push(eq(notifications.type, options.type));
    }

    return this.findMany({
      page,
      limit,
      filters: conditions,
      search: options.search,
      searchColumns: [notifications.title, notifications.message],
    });
  }

  async countUnread(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0] ? Number(result[0].count) : 0;
  }

  async markAllRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async archiveAll(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isArchived: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isArchived, false)));
  }

  async bulkDelete(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(notifications).where(inArray(notifications.id, ids));
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;
