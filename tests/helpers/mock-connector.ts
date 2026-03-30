/**
 * MockConnector — deterministic AI platform connector for testing.
 * Never calls real APIs. Returns fixture responses.
 */
import type {
  Connector, Thread, Turn, ThreadMetadata, ConnectorMetadata,
  CaptureOptions, ImportOptions, Platform,
} from "@basilica/core";
import { MOCK_TURNS } from "../fixtures/index.js";

export class MockConnector implements Connector {
  readonly platform: Platform = "mock";
  readonly displayName = "Mock Platform";

  private capturedTurns: Turn[] = [];

  async capture(options: CaptureOptions): Promise<Thread> {
    const thread = buildMockThread(options);
    return thread;
  }

  async import(transcript: string, options: ImportOptions): Promise<Thread> {
    const lines = transcript.trim().split("\n").filter(Boolean);
    const turns: Turn[] = lines.map((line, i) => ({
      id: `mock-turn-${i}`,
      threadId: "mock-thread-import",
      role: i % 2 === 0 ? "user" : "assistant",
      content: line,
      timestamp: new Date(),
      turn_index: i,
    }));
    const thread = buildMockThread(options);
    thread.turns = turns;
    return thread;
  }

  async identify(_rawSession: unknown): Promise<ThreadMetadata> {
    return { workspaceContext: "mock-workspace", tags: ["test"] };
  }

  async metadata(_rawSession: unknown): Promise<ConnectorMetadata> {
    return {
      platform: this.platform,
      model: "mock-model-1.0",
      sessionId: "mock-session-123",
    };
  }

  supports(input: unknown): boolean {
    if (typeof input !== "object" || input === null) return false;
    return (input as Record<string, unknown>)["platform"] === "mock";
  }

  /** Simulate a turn arriving from the mock AI platform */
  simulateTurn(content: string, role: "user" | "assistant" = "assistant"): Turn {
    const turn: Turn = {
      id: `mock-turn-${Date.now()}`,
      threadId: "mock-thread",
      role,
      content,
      timestamp: new Date(),
    };
    this.capturedTurns.push(turn);
    return turn;
  }

  getCapturedTurns(): Turn[] {
    return this.capturedTurns;
  }

  reset(): void {
    this.capturedTurns = [];
  }
}

function buildMockThread(options: CaptureOptions | ImportOptions): Thread {
  const now = new Date();
  const slug = options.instanceName
    ? `${options.instanceName}_${now.toISOString().slice(0, 16).replace("T", "_")}`
    : `MockThread_${now.toISOString().slice(0, 16).replace("T", "_")}`;

  return {
    id: `mock-thread-${Date.now()}`,
    slug,
    platform: "mock",
    model: "mock-model-1.0",
    instanceName: options.instanceName,
    turns: [],
    checkpoints: [],
    provenanceChain: [],
    metadata: { tags: options.tags ?? [] },
    createdAt: now,
    updatedAt: now,
    status: "active",
  };
}
