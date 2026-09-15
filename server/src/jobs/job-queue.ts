export interface JobQueue {
  schedule(delayMs: number, task: () => Promise<void> | void): void;
}
