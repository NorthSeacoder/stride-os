import { env } from '../env';
import * as postgresSchemaModule from './postgres';
import * as sqliteSchemaModule from './sqlite';

export const postgresSchema = postgresSchemaModule;
export const sqliteSchema = sqliteSchemaModule;

const activeSchema = env.databaseDriver === 'sqlite'
  ? sqliteSchemaModule
  : postgresSchemaModule;

export const users = activeSchema.users;
export const usersRelations = activeSchema.usersRelations;
export const sessions = activeSchema.sessions;
export const sessionsRelations = activeSchema.sessionsRelations;
export const apiTokens = activeSchema.apiTokens;
export const apiTokensRelations = activeSchema.apiTokensRelations;
export const auditLogs = activeSchema.auditLogs;
export const auditLogsRelations = activeSchema.auditLogsRelations;
export const exampleItems = activeSchema.exampleItems;
export const periods = activeSchema.periods;
export const periodsRelations = activeSchema.periodsRelations;
export const objectives = activeSchema.objectives;
export const objectivesRelations = activeSchema.objectivesRelations;
export const keyResults = activeSchema.keyResults;
export const keyResultsRelations = activeSchema.keyResultsRelations;
export const krCheckIns = activeSchema.krCheckIns;
export const krCheckInsRelations = activeSchema.krCheckInsRelations;
export const tasks = activeSchema.tasks;
export const tasksRelations = activeSchema.tasksRelations;
export const taskKrLinks = activeSchema.taskKrLinks;
export const taskKrLinksRelations = activeSchema.taskKrLinksRelations;
export const reviews = activeSchema.reviews;
export const reviewsRelations = activeSchema.reviewsRelations;
export const reviewKrSnapshots = activeSchema.reviewKrSnapshots;
export const reviewKrSnapshotsRelations = activeSchema.reviewKrSnapshotsRelations;
export const schema = activeSchema;
