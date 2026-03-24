/** Provenance record — one entry in the audit trail of a thread */
export interface ProvenanceRecord {
  id: string;
  threadId: string;
  eventType: string;
  timestamp: Date;
  actor: "user" | "assistant" | "system" | "openclaw" | "nemoclaw";
  detail: string;
  payload?: Record<string, unknown>;
}

/** Full exportable provenance chain for a thread */
export interface ProvenanceChain {
  threadId: string;
  threadSlug: string;
  exportedAt: Date;
  records: ProvenanceRecord[];
  crossReferences: CrossReference[];
}

export interface CrossReference {
  fromThreadId: string;
  toThreadId: string;
  relationship: "synthesis" | "continuation" | "fork" | "reference";
  note?: string;
}
