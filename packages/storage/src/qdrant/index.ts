import type { Thread } from "@boardroom/core";

export class QdrantStore {
  async indexThread(_thread: Thread): Promise<void> {
    throw new Error("QdrantStore.indexThread() — not yet implemented");
  }
  async search(_query: string, _limit?: number): Promise<Thread[]> {
    throw new Error("QdrantStore.search() — not yet implemented");
  }
}
