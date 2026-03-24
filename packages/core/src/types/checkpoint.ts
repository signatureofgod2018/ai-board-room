/** Formation Checkpoint — the identity fingerprint of a thread at a point in time */
export interface FormationCheckpoint {
  id: string;
  threadId: string;
  turnIndex: number;             // Checkpoint taken after this turn
  timestamp: Date;

  /** The thread's self-reported voice and current state */
  voiceStatement: string;

  /** Key decisions made in the session up to this point */
  keyDecisions: string[];

  /** Open questions being carried forward */
  openQuestions: string[];

  /** Observed behavioral characteristics */
  behavioralCharacteristics: string[];

  /** NemoClaw validation result */
  validation?: CheckpointValidation;
}

export interface CheckpointValidation {
  passed: boolean;
  score: number;                 // 0–1
  flags: ValidationFlag[];
  validatedAt: Date;
}

export interface ValidationFlag {
  type: "identity_drift" | "honesty_gap" | "obfuscation_event" | "quality_low";
  severity: "info" | "warning" | "critical";
  detail: string;
}
