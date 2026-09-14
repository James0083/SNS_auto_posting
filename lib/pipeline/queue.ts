// 배치로 제출된 job을 한 건씩 순차 처리하는 인프로세스 FIFO 큐.
// 이미지 생성(Cloudflare)에는 동시성 제한이 없어, 여러 job을 동시에 돌리면
// 레이트리밋·비용이 급증한다 — 그래서 한 번에 하나만 실행한다.
//
// Next.js dev HMR이 모듈을 여러 번 평가해도 큐가 중복 생성되지 않도록 globalThis에 캐싱한다
// (lib/db.ts와 동일한 함정 회피).

type JobRunner = () => Promise<void>;

type QueueState = {
  pending: JobRunner[];
  running: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __jobQueue: QueueState | undefined;
}

function state(): QueueState {
  if (!globalThis.__jobQueue) {
    globalThis.__jobQueue = { pending: [], running: false };
  }
  return globalThis.__jobQueue;
}

async function pump(): Promise<void> {
  const q = state();
  if (q.running) return;
  q.running = true;
  try {
    while (q.pending.length > 0) {
      const run = q.pending.shift()!;
      try {
        await run();
      } catch (e) {
        // 개별 파이프라인이 자체적으로 status='failed'와 로그를 남기므로 여기서는 콘솔만.
        console.error("job queue task error", e);
      }
    }
  } finally {
    q.running = false;
  }
}

export function enqueueJob(run: JobRunner): void {
  state().pending.push(run);
  void pump();
}

// 진행 상황 표시에 참고 (현재 대기 중인 job 수).
export function queuedCount(): number {
  return state().pending.length;
}
