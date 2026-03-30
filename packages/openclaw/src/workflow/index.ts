import type { Thread, Turn, TurnCapturedEvent } from "@basilica/core";

/**
 * WorkflowEngine — runs the capture pipeline on every conversation event:
 *   1. Capture turn
 *   2. Assign / confirm Thread ID
 *   3. Pass to NemoClaw for validation
 *   4. Store to sovereign storage
 *   5. Evaluate checkpoint rule (trigger if due)
 *   6. Emit event to Basilica dashboard
 */
export class WorkflowEngine {
  private checkpointIntervalTurns: number;

  constructor(checkpointIntervalTurns = 10) {
    this.checkpointIntervalTurns = checkpointIntervalTurns;
  }

  async processTurn(_thread: Thread, _turn: Turn): Promise<void> {
    throw new Error("WorkflowEngine.processTurn() — not yet implemented");
    // Steps to implement:
    // 1. Validate via NemoClaw
    // 2. Persist turn to storage
    // 3. Append provenance record
    // 4. Check if checkpoint is due (turnIndex % checkpointIntervalTurns === 0)
    // 5. Emit TurnCapturedEvent to dashboard
  }

  isCheckpointDue(turnIndex: number): boolean {
    return turnIndex > 0 && turnIndex % this.checkpointIntervalTurns === 0;
  }
}
