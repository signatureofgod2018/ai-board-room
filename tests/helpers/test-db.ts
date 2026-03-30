/**
 * Test database helpers — spin up and tear down a clean test schema.
 * Uses the `basilica_test` database (separate from dev/prod).
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const TEST_DB_URL = process.env["POSTGRES_TEST_URL"] ??
  "postgresql://basilica:basilica@localhost:5432/basilica_test";

const MIGRATIONS_DIR = join(process.cwd(), "packages/storage/migrations");

/**
 * Apply all migrations to the test database.
 * Called once in beforeAll() of integration test suites.
 */
export async function setupTestDatabase(): Promise<void> {
  // TODO: implement once PostgresStore is available
  // 1. Connect to TEST_DB_URL
  // 2. DROP SCHEMA public CASCADE; CREATE SCHEMA public;
  // 3. Run each migration file in order
  console.log(`[test-db] Setting up test database: ${TEST_DB_URL}`);
}

/**
 * Drop all data from test tables between tests.
 * Called in beforeEach() or afterEach() for isolation.
 */
export async function clearTestDatabase(): Promise<void> {
  // TODO: TRUNCATE all tables in reverse dependency order
  console.log("[test-db] Clearing test database tables");
}

/**
 * Tear down — disconnect and optionally drop the test schema.
 * Called in afterAll().
 */
export async function teardownTestDatabase(): Promise<void> {
  // TODO: disconnect pg client
  console.log("[test-db] Tearing down test database");
}

export const TEST_DB_URL_EXPORT = TEST_DB_URL;
