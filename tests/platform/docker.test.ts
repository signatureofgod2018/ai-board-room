/**
 * T0 — Docker Platform Test
 * Verifies Docker is running and required containers are healthy.
 * Run: npm run test:platform
 */
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

function dockerExec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (e: unknown) {
    throw new Error(`Docker command failed: ${cmd}\n${(e as Error).message}`);
  }
}

describe("T0 — Docker Platform", () => {
  it("docker daemon is running", () => {
    const output = dockerExec("docker info --format '{{.ServerVersion}}'");
    expect(output).toBeTruthy();
  });

  it("basilica-postgres container is running", () => {
    const status = dockerExec(
      "docker inspect --format='{{.State.Status}}' basilica-postgres 2>/dev/null || echo 'not found'"
    );
    expect(status, "basilica-postgres not running — run: docker compose up -d").toBe("running");
  });

  it("basilica-postgres container is healthy", () => {
    const health = dockerExec(
      "docker inspect --format='{{.State.Health.Status}}' basilica-postgres 2>/dev/null || echo 'unknown'"
    );
    expect(health, "basilica-postgres unhealthy").toBe("healthy");
  });

  it("basilica-qdrant container is running", () => {
    const status = dockerExec(
      "docker inspect --format='{{.State.Status}}' basilica-qdrant 2>/dev/null || echo 'not found'"
    );
    expect(status, "basilica-qdrant not running — run: docker compose up -d").toBe("running");
  });

  it("basilica-qdrant container is healthy", () => {
    const health = dockerExec(
      "docker inspect --format='{{.State.Health.Status}}' basilica-qdrant 2>/dev/null || echo 'unknown'"
    );
    expect(health, "basilica-qdrant unhealthy").toBe("healthy");
  });
});
