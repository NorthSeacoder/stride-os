declare module 'better-sqlite3' {
  class Database {
    constructor(filename: string);
    pragma(statement: string): unknown;
  }

  export = Database;
}
