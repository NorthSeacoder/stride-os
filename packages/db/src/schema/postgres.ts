import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  primaryKey,
  check,
  date,
  integer,
  doublePrecision,
  boolean,
} from 'drizzle-orm/pg-core';

const usersColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', usersColumns);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  apiTokens: many(apiTokens),
  auditLogs: many(auditLogs),
}));

const sessionsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const sessions = pgTable('sessions', sessionsColumns);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

const apiTokensColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  scopes: jsonb('scopes').$type<string[]>().default([]),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const apiTokens = pgTable('api_tokens', apiTokensColumns);

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, { fields: [apiTokens.userId], references: [users.id] }),
}));

const auditLogsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  actorType: varchar('actor_type', { length: 50 }).notNull(),
  actorId: uuid('actor_id'),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId: uuid('target_id'),
  targetTitle: varchar('target_title', { length: 255 }),
  source: varchar('source', { length: 50 }),
  summary: text('summary'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const auditLogs = pgTable('audit_logs', auditLogsColumns, (table) => [
  index('idx_audit_logs_created_at').on(table.createdAt),
  index('idx_audit_logs_target_created_at').on(table.targetType, table.targetId, table.createdAt),
  index('idx_audit_logs_actor_created_at').on(table.actorType, table.actorId, table.createdAt),
  index('idx_audit_logs_action_created_at').on(table.action, table.createdAt),
  index('idx_audit_logs_source_created_at').on(table.source, table.createdAt),
]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
    relationName: 'auditLogActor',
  }),
}));

const exampleItemsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const exampleItems = pgTable('example_items', exampleItemsColumns);

const periodsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const periods = pgTable('periods', periodsColumns, (table) => [
  index('idx_periods_status').on(table.status),
  index('idx_periods_start_date').on(table.startDate),
  check('periods_type_check', sql`${table.type} in ('year', 'quarter', 'month', 'custom')`),
  check('periods_status_check', sql`${table.status} in ('active', 'archived')`),
  check('periods_date_range_check', sql`${table.endDate} >= ${table.startDate}`),
]);

export const periodsRelations = relations(periods, ({ many }) => ({
  objectives: many(objectives),
}));

const objectivesColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  periodId: uuid('period_id')
    .notNull()
    .references(() => periods.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const objectives = pgTable('objectives', objectivesColumns, (table) => [
  index('idx_objectives_period_id').on(table.periodId),
  index('idx_objectives_status').on(table.status),
  check('objectives_status_check', sql`${table.status} in ('active', 'done', 'archived')`),
]);

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  period: one(periods, { fields: [objectives.periodId], references: [periods.id] }),
  keyResults: many(keyResults),
}));

const keyResultsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  objectiveId: uuid('objective_id')
    .notNull()
    .references(() => objectives.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  targetValue: doublePrecision('target_value'),
  currentValue: doublePrecision('current_value'),
  unit: varchar('unit', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  confidence: varchar('confidence', { length: 16 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const keyResults = pgTable('key_results', keyResultsColumns, (table) => [
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

const krCheckInsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  keyResultId: uuid('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  progressValue: doublePrecision('progress_value'),
  confidence: varchar('confidence', { length: 16 }).notNull(),
  summary: text('summary'),
  blockers: text('blockers'),
  nextActions: text('next_actions'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const krCheckIns = pgTable('kr_check_ins', krCheckInsColumns, (table) => [
  index('idx_kr_check_ins_key_result_id').on(table.keyResultId),
  index('idx_kr_check_ins_created_at').on(table.createdAt),
  check('kr_check_ins_confidence_check', sql`${table.confidence} in ('low', 'medium', 'high')`),
]);

export const krCheckInsRelations = relations(krCheckIns, ({ one }) => ({
  keyResult: one(keyResults, { fields: [krCheckIns.keyResultId], references: [keyResults.id] }),
}));

const taskListsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 64 }),
  kind: varchar('kind', { length: 16 }).notNull(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const taskLists = pgTable('task_lists', taskListsColumns, (table) => [
  index('idx_task_lists_kind').on(table.kind),
  index('idx_task_lists_sort_order').on(table.sortOrder),
  check('task_lists_kind_check', sql`${table.kind} in ('system', 'user')`),
]);

export const taskListsRelations = relations(taskLists, ({ many }) => ({
  tasks: many(tasks),
  definitions: many(taskDefinitions),
}));

const taskDefinitionsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  listId: uuid('list_id')
    .notNull()
    .references(() => taskLists.id, { onDelete: 'cascade' }),
  frequency: varchar('frequency', { length: 16 }).notNull(),
  endType: varchar('end_type', { length: 16 }).notNull(),
  endDate: date('end_date'),
  occurrenceCount: integer('occurrence_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const taskDefinitions = pgTable('task_definitions', taskDefinitionsColumns, (table) => [
  index('idx_task_definitions_list_id').on(table.listId),
  index('idx_task_definitions_frequency').on(table.frequency),
  check('task_definitions_frequency_check', sql`${table.frequency} in ('daily', 'weekly', 'monthly', 'weekdays', 'weekends')`),
  check('task_definitions_end_type_check', sql`${table.endType} in ('never', 'until_date', 'after_count')`),
]);

export const taskDefinitionsRelations = relations(taskDefinitions, ({ one, many }) => ({
  list: one(taskLists, { fields: [taskDefinitions.listId], references: [taskLists.id] }),
  tasks: many(tasks),
  keyResultLinks: many(taskDefinitionKrLinks),
}));

const tasksColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  notes: text('notes'),
  description: text('description'),
  status: varchar('status', { length: 32 }).notNull().default('inbox'),
  listId: uuid('list_id')
    .references(() => taskLists.id, { onDelete: 'set null' }),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  definitionId: uuid('definition_id')
    .references(() => taskDefinitions.id, { onDelete: 'set null' }),
  occurrenceDate: date('occurrence_date'),
  priority: varchar('priority', { length: 8 }),
  energy: varchar('energy', { length: 16 }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const tasks = pgTable('tasks', tasksColumns, (table) => [
  index('idx_tasks_status').on(table.status),
  index('idx_tasks_list_id').on(table.listId),
  index('idx_tasks_due_date').on(table.dueDate),
  index('idx_tasks_completed_at').on(table.completedAt),
  index('idx_tasks_archived_at').on(table.archivedAt),
  index('idx_tasks_definition_id').on(table.definitionId),
  index('idx_tasks_definition_occurrence').on(table.definitionId, table.occurrenceDate),
  index('idx_tasks_priority').on(table.priority),
  check('tasks_status_check', sql`${table.status} in ('inbox', 'done')`),
  check('tasks_priority_check', sql`${table.priority} is null or ${table.priority} in ('P1', 'P2', 'P3')`),
  check('tasks_energy_check', sql`${table.energy} is null or ${table.energy} in ('low', 'medium', 'high')`),
  check('tasks_completed_state_check', sql`(${table.status} = 'done' and ${table.completedAt} is not null) or (${table.status} <> 'done' and ${table.completedAt} is null)`),
]);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  list: one(taskLists, { fields: [tasks.listId], references: [taskLists.id] }),
  definition: one(taskDefinitions, { fields: [tasks.definitionId], references: [taskDefinitions.id] }),
  keyResultLinks: many(taskKrLinks),
}));

const taskKrLinksColumns = {
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  keyResultId: uuid('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  countsTowardCommitment: boolean('counts_toward_commitment').notNull().default(false),
  committedAt: timestamp('committed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const taskKrLinks = pgTable('task_kr_links', taskKrLinksColumns, (table) => [
  primaryKey({ columns: [table.taskId, table.keyResultId] }),
  index('idx_task_kr_links_key_result_id').on(table.keyResultId),
  index('idx_task_kr_links_commitment').on(table.keyResultId, table.countsTowardCommitment),
]);

export const taskKrLinksRelations = relations(taskKrLinks, ({ one }) => ({
  task: one(tasks, { fields: [taskKrLinks.taskId], references: [tasks.id] }),
  keyResult: one(keyResults, { fields: [taskKrLinks.keyResultId], references: [keyResults.id] }),
}));

const taskDefinitionKrLinksColumns = {
  definitionId: uuid('definition_id')
    .notNull()
    .references(() => taskDefinitions.id, { onDelete: 'cascade' }),
  keyResultId: uuid('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  countsTowardCommitment: boolean('counts_toward_commitment').notNull().default(false),
  committedAt: timestamp('committed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const taskDefinitionKrLinks = pgTable('task_definition_kr_links', taskDefinitionKrLinksColumns, (table) => [
  primaryKey({ columns: [table.definitionId, table.keyResultId] }),
  index('idx_task_definition_kr_links_key_result_id').on(table.keyResultId),
  index('idx_task_definition_kr_links_commitment').on(table.keyResultId, table.countsTowardCommitment),
]);

export const taskDefinitionKrLinksRelations = relations(taskDefinitionKrLinks, ({ one }) => ({
  definition: one(taskDefinitions, { fields: [taskDefinitionKrLinks.definitionId], references: [taskDefinitions.id] }),
  keyResult: one(keyResults, { fields: [taskDefinitionKrLinks.keyResultId], references: [keyResults.id] }),
}));

const reviewsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 32 }).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  structuredSummary: jsonb('structured_summary').$type<Record<string, unknown>>(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const reviews = pgTable('reviews', reviewsColumns, (table) => [
  index('idx_reviews_type').on(table.type),
  index('idx_reviews_period_start_end').on(table.periodStart, table.periodEnd),
  index('idx_reviews_status').on(table.status),
  index('idx_reviews_archived_at').on(table.archivedAt),
  check('reviews_type_check', sql`${table.type} in ('weekly', 'monthly', 'period')`),
  check('reviews_status_check', sql`${table.status} in ('draft', 'final')`),
  check('reviews_period_range_check', sql`${table.periodEnd} >= ${table.periodStart}`),
]);

export const reviewsRelations = relations(reviews, ({ many }) => ({
  krSnapshots: many(reviewKrSnapshots),
}));

const reviewKrSnapshotsColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviews.id, { onDelete: 'cascade' }),
  keyResultId: uuid('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const reviewKrSnapshots = pgTable('review_kr_snapshots', reviewKrSnapshotsColumns, (table) => [
  index('idx_review_kr_snapshots_review_id').on(table.reviewId),
  index('idx_review_kr_snapshots_key_result_id').on(table.keyResultId),
]);

export const reviewKrSnapshotsRelations = relations(reviewKrSnapshots, ({ one }) => ({
  review: one(reviews, { fields: [reviewKrSnapshots.reviewId], references: [reviews.id] }),
  keyResult: one(keyResults, { fields: [reviewKrSnapshots.keyResultId], references: [keyResults.id] }),
}));
