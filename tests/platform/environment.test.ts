/**
 * T0 — Environment Platform Test
 * Verifies all prerequisites are met before running any other suite.
 * Run: npm run test:platform
 */
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

describe("T0 — Environment Prerequisites", () => {
  it("Node.js version is >= 20", () => {
    const [major] = process.versions.node.split(".").map(Number);
    expect(major, `Node ${process.versions.node} is too old — upgrade to v20+`).toBeGreaterThanOrEqual(20);
  });

  it("POSTGRES_URL env var is set", () => {
    expect(
      process.env["POSTGRES_URL"] ?? process.env["POSTGRES_TEST_URL"],
      "Set POSTGRES_URL in .env"
    ).toBeTruthy();
  });

  it("QDRANT_URL env var is set", () => {
    expect(process.env["QDRANT_URL"], "Set QDRANT_URL in .env").toBeTruthy();
  });

  it("@basilica/core is built (dist exists)", () => {
    const distPath = join(process.cwd(), "packages/core/dist/index.js");
    expect(existsSync(distPath), `Run 'npm run build' first — missing ${distPath}`).toBe(true);
  });

  it("@basilica/openclaw is built (dist exists)", () => {
    const distPath = join(process.cwd(), "packages/openclaw/dist/index.js");
    expect(existsSync(distPath), `Run 'npm run build' first — missing ${distPath}`).toBe(true);
  });

  it("@basilica/storage is built (dist exists)", () => {
    const distPath = join(process.cwd(), "packages/storage/dist/index.js");
    expect(existsSync(distPath), `Run 'npm run build' first — missing ${distPath}`).toBe(true);
  });

  it("docker CLI is available", () => {
    let dockerVersion: string;
    try {
      dockerVersion = execSync("docker --version", { encoding: "utf8" }).trim();
    } catch {
      throw new Error("Docker CLI not found — install Docker Desktop and ensure it is running");
    }
    expect(dockerVersion).toMatch(/Docker version/);
  });

  it("docker compose is available", () => {
    let version: string;
    try {
      version = execSync("docker compose version", { encoding: "utf8" }).trim();
    } catch {
      throw new Error("docker compose not found");
    }
    expect(version).toMatch(/Docker Compose/);
  });
});
