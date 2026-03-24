import { BaseConnector } from "../base/connector.js";
import type { Thread, ThreadMetadata, ConnectorMetadata, CaptureOptions, ImportOptions } from "@boardroom/core";

/** Connector for Claude (web) and Claude Code (VS Code) sessions */
export class ClaudeConnector extends BaseConnector {
  readonly platform = "claude" as const;
  readonly displayName = "Claude / Claude Code";

  async capture(_options: CaptureOptions): Promise<Thread> {
    throw new Error("ClaudeConnector.capture() — not yet implemented");
  }

  async import(_transcript: string, _options: ImportOptions): Promise<Thread> {
    throw new Error("ClaudeConnector.import() — not yet implemented");
  }

  async identify(_rawSession: unknown): Promise<ThreadMetadata> {
    throw new Error("ClaudeConnector.identify() — not yet implemented");
  }

  async metadata(_rawSession: unknown): Promise<ConnectorMetadata> {
    throw new Error("ClaudeConnector.metadata() — not yet implemented");
  }

  supports(input: unknown): boolean {
    if (typeof input !== "object" || input === null) return false;
    const obj = input as Record<string, unknown>;
    return obj["platform"] === "claude" || obj["platform"] === "claude-code";
  }
}
