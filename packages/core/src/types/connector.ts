import type { Thread, Turn, ThreadMetadata, Platform } from "./thread.js";

/** Abstract interface every platform connector must implement */
export interface Connector {
  readonly platform: Platform;
  readonly displayName: string;

  /** Begin live capture of a session. Returns the Thread created. */
  capture(options: CaptureOptions): Promise<Thread>;

  /** Import a transcript from text/file. Returns the Thread created. */
  import(transcript: string, options: ImportOptions): Promise<Thread>;

  /** Extract identity metadata from a raw session */
  identify(rawSession: unknown): Promise<ThreadMetadata>;

  /** Extract platform/model/session metadata */
  metadata(rawSession: unknown): Promise<ConnectorMetadata>;

  /** Check if this connector can handle the given input */
  supports(input: unknown): boolean;
}

export interface CaptureOptions {
  instanceName?: string;
  tags?: string[];
  checkpointIntervalTurns?: number;  // Trigger checkpoint every N turns
}

export interface ImportOptions extends CaptureOptions {
  platform: Platform;
  model?: string;
  sessionDate?: Date;
}

export interface ConnectorMetadata {
  platform: Platform;
  model: string;
  sessionId?: string;
  workspaceContext?: string;
  userAgent?: string;
}

/** Event emitted by a connector when a new turn is captured */
export interface TurnCapturedEvent {
  thread: Thread;
  turn: Turn;
  turnIndex: number;
}
