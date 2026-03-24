import type { Turn, TurnCapturedEvent } from "@boardroom/core";

/**
 * MessageProxy — intercepts every conversation turn before and after
 * it reaches the AI platform, tagging it with a Thread ID and timestamp.
 */
export class MessageProxy {
  private listeners: Array<(event: TurnCapturedEvent) => void> = [];

  onTurnCaptured(listener: (event: TurnCapturedEvent) => void): void {
    this.listeners.push(listener);
  }

  async interceptOutbound(_turn: Omit<Turn, "id" | "timestamp">): Promise<Turn> {
    throw new Error("MessageProxy.interceptOutbound() — not yet implemented");
  }

  async interceptInbound(_turn: Omit<Turn, "id" | "timestamp">): Promise<Turn> {
    throw new Error("MessageProxy.interceptInbound() — not yet implemented");
  }
}
