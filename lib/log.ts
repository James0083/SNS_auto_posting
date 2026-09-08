import { getDb } from "@/lib/db";

export type JobKind = "ig" | "reels";
export type LogLevel = "info" | "warn" | "error";

export function jobLog(kind: JobKind, jobId: number, level: LogLevel, message: string): void {
  getDb()
    .prepare("INSERT INTO job_logs (job_kind, job_id, level, message) VALUES (?, ?, ?, ?)")
    .run(kind, jobId, level, message);
}

export function getJobLogs(kind: JobKind, jobId: number) {
  return getDb()
    .prepare(
      "SELECT id, level, message, created_at FROM job_logs WHERE job_kind = ? AND job_id = ? ORDER BY id ASC",
    )
    .all(kind, jobId);
}
