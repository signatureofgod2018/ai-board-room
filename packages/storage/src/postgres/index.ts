import type { Thread, Turn, FormationCheckpoint, ProvenanceRecord } from "@boardroom/core";

export class PostgresStore {
  async saveThread(_thread: Thread): Promise<void> {
    throw new Error("PostgresStore.saveThread() — not yet implemented");
  }
  async getThread(_id: string): Promise<Thread | null> {
    throw new Error("PostgresStore.getThread() — not yet implemented");
  }
  async listThreads(_filter?: Partial<Thread>): Promise<Thread[]> {
    throw new Error("PostgresStore.listThreads() — not yet implemented");
  }
  async saveTurn(_turn: Turn): Promise<void> {
    throw new Error("PostgresStore.saveTurn() — not yet implemented");
  }
  async saveCheckpoint(_checkpoint: FormationCheckpoint): Promise<void> {
    throw new Error("PostgresStore.saveCheckpoint() — not yet implemented");
  }
  async saveProvenance(_record: ProvenanceRecord): Promise<void> {
    throw new Error("PostgresStore.saveProvenance() — not yet implemented");
  }
}
