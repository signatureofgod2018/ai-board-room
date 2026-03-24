import type { Thread, ProvenanceChain } from "@boardroom/core";

/** Exports threads in Bill's InstanceName.Handoff_Vx.x.md format */
export class MarkdownExporter {
  async exportHandoff(_thread: Thread, _version: string): Promise<string> {
    throw new Error("MarkdownExporter.exportHandoff() — not yet implemented");
  }
  async exportProvenance(_chain: ProvenanceChain): Promise<string> {
    throw new Error("MarkdownExporter.exportProvenance() — not yet implemented");
  }
}
