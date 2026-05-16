declare module 'better-sqlite3' {
  type SqliteFunction = (...args: unknown[]) => unknown;

  type Transaction<T extends SqliteFunction> = T & {
    deferred: T;
    immediate: T;
    exclusive: T;
  };

  type Statement<Result = unknown> = {
    get(...params: unknown[]): Result;
    all(...params: unknown[]): Result[];
    run(...params: unknown[]): unknown;
  };

  class Database {
    constructor(filename: string, options?: { readonly?: boolean });
    pragma(statement: string): unknown;
    exec(sql: string): void;
    prepare<Result = unknown>(sql: string): Statement<Result>;
    transaction<T extends SqliteFunction>(fn: T): Transaction<T>;
    close(): void;
  }

  export = Database;
}
