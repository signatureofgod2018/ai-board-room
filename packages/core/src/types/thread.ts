/** A single tracked AI conversation thread */
export interface Thread {
  id: string;                    // UUID
  slug: string;                  // Human-readable: "InstanceName_YYYY-MM-DD_HH:MM"
  platform: Platform;
  model: string;                 // e.g. "claude-sonnet-4-6"
  instanceName?: string;         // Named instance (e.g. "Patrick", "Clare")
  turns: Turn[];
  checkpoints: CheckpointRef[];
  provenanceChain: ProvenanceRef[];
  metadata: ThreadMetadata;
  createdAt: Date;
  updatedAt: Date;
  status: ThreadStatus;
}

export interface Turn {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ThreadMetadata {
  workspaceContext?: string;     // Project / file / environment
  sessionId?: string;            // Platform-native session ID (if exposed)
  userAgent?: string;
  tags?: string[];
  crossReferences?: string[];    // Thread IDs of related threads
}

export type Platform = "claude" | "claude-code" | "copilot" | string;

export type ThreadStatus = "active" | "closed" | "archived";

export interface CheckpointRef {
  checkpointId: string;
  turnIndex: number;             // After which turn the checkpoint was taken
  timestamp: Date;
}

export interface ProvenanceRef {
  recordId: string;
  timestamp: Date;
  eventType: ProvenanceEventType;
}

export type ProvenanceEventType =
  | "created"
  | "turn_captured"
  | "checkpoint_recorded"
  | "cross_referenced"
  | "exported"
  | "obfuscation_event_detected";
