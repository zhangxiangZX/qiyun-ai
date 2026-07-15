import type { DocumentIndexJob, QueueLike } from "./document.types";

export class InMemoryDocumentQueue implements QueueLike {
  private readonly jobs: DocumentIndexJob[] = [];

  enqueue(job: DocumentIndexJob): void {
    this.jobs.push(job);
  }

  list(): DocumentIndexJob[] {
    return [...this.jobs];
  }

  clear(): void {
    this.jobs.length = 0;
  }
}
