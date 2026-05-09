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
export const schema = activeSchema;
