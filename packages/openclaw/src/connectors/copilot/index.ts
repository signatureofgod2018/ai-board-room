import { BaseConnector } from "../base/connector.js";
import type { Thread, ThreadMetadata, ConnectorMetadata, CaptureOptions, ImportOptions } from "@basilica/core";

/** Connector for VS Code Copilot chat sessions */
export class CopilotConnector extends BaseConnector {
  readonly platform = "copilot" as const;
  readonly displayName = "VS Code Copilot";

  async capture(_options: CaptureOptions): Promise<Thread> {
    throw new Error("CopilotConnector.capture() — not yet implemented");
  }

  async import(_transcript: string, _options: ImportOptions): Promise<Thread> {
    throw new Error("CopilotConnector.import() — not yet implemented");
  }

  async identify(_rawSession: unknown): Promise<ThreadMetadata> {
    throw new Error("CopilotConnector.identify() — not yet implemented");
  }

  async metadata(_rawSession: unknown): Promise<ConnectorMetadata> {
    throw new Error("CopilotConnector.metadata() — not yet implemented");
  }

  supports(input: unknown): boolean {
    if (typeof input !== "object" || input === null) return false;
    const obj = input as Record<string, unknown>;
    return obj["platform"] === "copilot";
  }
}
