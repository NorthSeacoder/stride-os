import { randomUUID } from 'crypto';
import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index, primaryKey, check } from 'drizzle-orm/sqlite-core';

const timestampColumn = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestampColumn('updated_at').notNull().$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  apiTokens: many(apiTokens),
  auditLogs: many(auditLogs),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestampColumn('expires_at').notNull(),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  scopes: text('scopes', { mode: 'json' }).$type<string[]>(),
  lastUsedAt: timestampColumn('last_used_at'),
  expiresAt: timestampColumn('expires_at'),
  revokedAt: timestampColumn('revoked_at'),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
});

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, { fields: [apiTokens.userId], references: [users.id] }),
}));

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
    relationName: 'auditLogActor',
  }),
}));

export const exampleItems = sqliteTable('example_items', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  title: text('title').notNull(),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestampColumn('updated_at').notNull().$defaultFn(() => new Date()),
});

export const periods = sqliteTable('periods', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  type: text('type').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestampColumn('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_periods_status').on(table.status),
  index('idx_periods_start_date').on(table.startDate),
  check('periods_type_check', sql`${table.type} in ('year', 'quarter', 'month', 'custom')`),
  check('periods_status_check', sql`${table.status} in ('active', 'archived')`),
  check('periods_date_range_check', sql`${table.endDate} >= ${table.startDate}`),
]);

export const periodsRelations = relations(periods, ({ many }) => ({
  objectives: many(objectives),
}));

export const objectives = sqliteTable('objectives', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  periodId: text('period_id')
    .notNull()
    .references(() => periods.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestampColumn('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_objectives_period_id').on(table.periodId),
  index('idx_objectives_status').on(table.status),
  check('objectives_status_check', sql`${table.status} in ('active', 'done', 'archived')`),
]);

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  period: one(periods, { fields: [objectives.periodId], references: [periods.id] }),
  keyResults: many(keyResults),
}));

export const keyResults = sqliteTable('key_results', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  objectiveId: text('objective_id')
    .notNull()
    .references(() => objectives.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: text('type').notNull(),
  targetValue: real('target_value'),
  currentValue: real('current_value'),
  unit: text('unit'),
  status: text('status').notNull().default('active'),
  confidence: text('confidence'),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestampColumn('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_key_results_objective_id').on(table.objectiveId),
  index('idx_key_results_status').on(table.status),
  check('key_results_type_check', sql`${table.type} in ('numeric', 'milestone', 'hybrid')`),
  check('key_results_status_check', sql`${table.status} in ('active', 'at_risk', 'done', 'archived')`),
  check('key_results_confidence_check', sql`${table.confidence} is null or ${table.confidence} in ('low', 'medium', 'high')`),
]);

export const keyResultsRelations = relations(keyResults, ({ one, many }) => ({
  objective: one(objectives, { fields: [keyResults.objectiveId], references: [objectives.id] }),
  checkIns: many(krCheckIns),
  taskLinks: many(taskKrLinks),
  reviewSnapshots: many(reviewKrSnapshots),
}));

export const krCheckIns = sqliteTable('kr_check_ins', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  keyResultId: text('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  progressValue: real('progress_value'),
  confidence: text('confidence').notNull(),
  summary: text('summary'),
  blockers: text('blockers'),
  nextActions: text('next_actions'),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_kr_check_ins_key_result_id').on(table.keyResultId),
  index('idx_kr_check_ins_created_at').on(table.createdAt),
  check('kr_check_ins_confidence_check', sql`${table.confidence} in ('low', 'medium', 'high')`),
]);

export const krCheckInsRelations = relations(krCheckIns, ({ one }) => ({
  keyResult: one(keyResults, { fields: [krCheckIns.keyResultId], references: [keyResults.id] }),
}));

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  title: text('title').notNull(),
  notes: text('notes'),
  status: text('status').notNull().default('inbox'),
  todayType: text('today_type'),
  scheduledDate: text('scheduled_date'),
  dueDate: text('due_date'),
  completedAt: timestampColumn('completed_at'),
  important: integer('important', { mode: 'boolean' }).notNull().default(false),
  urgent: integer('urgent', { mode: 'boolean' }).notNull().default(false),
  priority: text('priority'),
  energy: text('energy'),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestampColumn('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_tasks_status').on(table.status),
  index('idx_tasks_today_type').on(table.todayType),
  index('idx_tasks_scheduled_date').on(table.scheduledDate),
  index('idx_tasks_due_date').on(table.dueDate),
  index('idx_tasks_priority').on(table.priority),
  index('idx_tasks_importance_urgency').on(table.important, table.urgent),
  check('tasks_status_check', sql`${table.status} in ('inbox', 'today', 'scheduled', 'done', 'canceled')`),
  check('tasks_today_type_value_check', sql`${table.todayType} is null or ${table.todayType} in ('must', 'focus')`),
  check('tasks_today_type_state_check', sql`(${table.status} = 'today' and ${table.todayType} is not null) or (${table.status} <> 'today' and ${table.todayType} is null)`),
  check('tasks_priority_check', sql`${table.priority} is null or ${table.priority} in ('P1', 'P2', 'P3')`),
  check('tasks_energy_check', sql`${table.energy} is null or ${table.energy} in ('low', 'medium', 'high')`),
  check('tasks_completed_state_check', sql`(${table.status} = 'done' and ${table.completedAt} is not null) or (${table.status} <> 'done' and ${table.completedAt} is null)`),
]);

export const tasksRelations = relations(tasks, ({ many }) => ({
  keyResultLinks: many(taskKrLinks),
}));

export const taskKrLinks = sqliteTable('task_kr_links', {
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  keyResultId: text('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.keyResultId] }),
  index('idx_task_kr_links_key_result_id').on(table.keyResultId),
]);

export const taskKrLinksRelations = relations(taskKrLinks, ({ one }) => ({
  task: one(tasks, { fields: [taskKrLinks.taskId], references: [tasks.id] }),
  keyResult: one(keyResults, { fields: [taskKrLinks.keyResultId], references: [keyResults.id] }),
}));

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  type: text('type').notNull(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  status: text('status').notNull().default('draft'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  structuredSummary: text('structured_summary', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestampColumn('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_reviews_type').on(table.type),
  index('idx_reviews_period_start_end').on(table.periodStart, table.periodEnd),
  index('idx_reviews_status').on(table.status),
  check('reviews_type_check', sql`${table.type} in ('weekly', 'monthly', 'period')`),
  check('reviews_status_check', sql`${table.status} in ('draft', 'final')`),
  check('reviews_period_range_check', sql`${table.periodEnd} >= ${table.periodStart}`),
]);

export const reviewsRelations = relations(reviews, ({ many }) => ({
  krSnapshots: many(reviewKrSnapshots),
}));

export const reviewKrSnapshots = sqliteTable('review_kr_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  reviewId: text('review_id')
    .notNull()
    .references(() => reviews.id, { onDelete: 'cascade' }),
  keyResultId: text('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  snapshot: text('snapshot', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  createdAt: timestampColumn('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_review_kr_snapshots_review_id').on(table.reviewId),
  index('idx_review_kr_snapshots_key_result_id').on(table.keyResultId),
]);

export const reviewKrSnapshotsRelations = relations(reviewKrSnapshots, ({ one }) => ({
  review: one(reviews, { fields: [reviewKrSnapshots.reviewId], references: [reviews.id] }),
  keyResult: one(keyResults, { fields: [reviewKrSnapshots.keyResultId], references: [keyResults.id] }),
}));
