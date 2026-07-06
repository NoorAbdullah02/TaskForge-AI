import { db } from '../db';
import { eq, and, isNull, ilike, or, SQL, desc, asc, count } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';

// Use a looser table constraint to avoid Drizzle's internal generic type checks
// while still providing structural typing at the public API level.
type AnyPgTable = PgTable & Record<string, any>;

export abstract class BaseRepository<TTable extends AnyPgTable> {
  protected table: TTable;

  constructor(table: TTable) {
    this.table = table;
  }

  async findById(id: number | string, includeDeleted = false): Promise<any | null> {
    const conditions: SQL[] = [eq(this.table['id'], id)];

    if (!includeDeleted && 'deletedAt' in this.table) {
      conditions.push(isNull(this.table['deletedAt']));
    }

    const [result] = await (db as any)
      .select()
      .from(this.table)
      .where(and(...conditions))
      .limit(1);

    return result || null;
  }

  async create(data: any): Promise<any> {
    const [result] = await (db as any)
      .insert(this.table)
      .values(data)
      .returning();
    return result;
  }

  async update(id: number | string, data: any): Promise<any | null> {
    const conditions: SQL[] = [eq(this.table['id'], id)];
    if ('deletedAt' in this.table) {
      conditions.push(isNull(this.table['deletedAt']));
    }

    const [result] = await (db as any)
      .update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    return result || null;
  }

  async delete(id: number | string, soft = true): Promise<boolean> {
    if (soft && 'deletedAt' in this.table) {
      const [result] = await (db as any)
        .update(this.table)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(this.table['id'], id))
        .returning();
      return !!result;
    }

    const [result] = await (db as any)
      .delete(this.table)
      .where(eq(this.table['id'], id))
      .returning();
    return !!result;
  }

  async restore(id: number | string): Promise<boolean> {
    if ('deletedAt' in this.table) {
      const [result] = await (db as any)
        .update(this.table)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(this.table['id'], id))
        .returning();
      return !!result;
    }
    return false;
  }

  async findMany(options: {
    page?: number;
    limit?: number;
    filters?: SQL[];
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    searchColumns?: PgColumn[];
    includeDeleted?: boolean;
  } = {}): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = options.filters ? [...options.filters] : [];

    // Filter out soft deleted records if table supports it
    if (!options.includeDeleted && 'deletedAt' in this.table) {
      conditions.push(isNull(this.table['deletedAt']));
    }

    // Apply search filter
    if (options.search && options.searchColumns && options.searchColumns.length > 0) {
      const searchWildcard = `%${options.search}%`;
      const searchConditions = options.searchColumns.map((col) =>
        ilike(col, searchWildcard)
      );
      conditions.push(or(...searchConditions)!);
    }

    const whereClause = and(...conditions);

    // Apply Sorting
    const createdAtCol = this.table['createdAt'];
    let orderByClause: any = createdAtCol ? desc(createdAtCol) : undefined;
    if (options.sortField && options.sortField in this.table) {
      const col = this.table[options.sortField];
      orderByClause = options.sortOrder === 'asc' ? asc(col) : desc(col);
    }

    // Execute queries in parallel
    const baseQuery = (db as any)
      .select()
      .from(this.table)
      .where(whereClause);

    const dataQuery = orderByClause
      ? baseQuery.orderBy(orderByClause).limit(limit).offset(offset)
      : baseQuery.limit(limit).offset(offset);

    const countQuery = (db as any)
      .select({ count: count() })
      .from(this.table)
      .where(whereClause);

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = countResult?.[0] ? Number(countResult[0].count) : 0;

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
