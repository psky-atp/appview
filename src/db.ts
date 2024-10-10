import SqliteDb from "better-sqlite3";
import {
  Kysely,
  Migrator,
  SqliteDialect,
  Migration,
  MigrationProvider,
  CompiledQuery,
} from "kysely";

// Types

export type DatabaseSchema = {
  posts: Post;
  accounts: Account;
};

export type Post = {
  uri: string;
  cid: string;
  post: string;
  facets: string | null; // JSON string
  reply: string | null; // JSON string
  account_did: string;
  indexed_at: number;
  updated_at: number | null;
};

export type Account = {
  did: string;
  handle: string;
  nickname: string | null;
};

// Migrations

const migrations: Record<string, Migration> = {};

const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

migrations["001"] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable("posts")
      .addColumn("uri", "text", (col) => col.primaryKey())
      .addColumn("post", "text", (col) => col.notNull())
      .addColumn("account_did", "text", (col) => col.notNull())
      .addColumn("indexed_at", "integer", (col) => col.notNull())
      .addForeignKeyConstraint(
        "account_foreign",
        ["account_did"],
        "accounts",
        ["did"],
        (col) => col.onDelete("cascade"),
      )
      .execute();

    await db.schema
      .createTable("accounts")
      .addColumn("did", "text", (col) => col.primaryKey())
      .addColumn("handle", "text", (col) => col.notNull())
      .addColumn("nickname", "text")
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("posts").execute();
    await db.schema.dropTable("accounts").execute();
  },
};

migrations["002"] = {
  async up(db: Kysely<unknown>) {
    await db.schema.alterTable("posts").addColumn("facets", "text").execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("posts").execute();
  },
};

migrations["003"] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .alterTable("posts")
      .addColumn("updated_at", "integer")
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("posts").execute();
  },
};

migrations["004"] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .alterTable("posts")
      .addColumn("cid", "text", (col) => col.notNull())
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("posts").execute();
  },
};

migrations["005"] = {
  async up(db: Kysely<unknown>) {
    await db.schema.alterTable("posts").addColumn("reply", "text").execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("posts").execute();
  },
};

// APIs

export const createDb = (location: string): Database => {
  const db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: new SqliteDb(location),
    }),
  });
  db.executeQuery(CompiledQuery.raw("PRAGMA journal_mode = WAL"));
  return db;
};

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
};

export type Database = Kysely<DatabaseSchema>;
