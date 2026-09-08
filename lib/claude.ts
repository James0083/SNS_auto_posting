import { spawn } from "node:child_process";
import type { z } from "zod";
import { getSettings } from "@/lib/settings";

const isWin = process.platform === "win32";
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";

type ClaudeResult = { ok: true; text: string } | { ok: false; error: string };

// 동시성 세마포어 — claude 프로세스를 무제한으로 띄우지 않기 위함.
// 설정값은 호출 시점마다 새로 읽어, 설정 변경이 즉시 반영되게 한다.
let active = 0;
const waiters: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  const limit = getSettings().claudeConcurrency;
  if (active < limit) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  active++;
}

function releaseSlot(): void {
  active--;
  const next = waiters.shift();
  if (next) next();
}

function runClaudeRaw(
  prompt: string,
  timeoutSec: number,
  allowedTools?: string[],
): Promise<ClaudeResult> {
  return new Promise((resolve) => {
    const args = ["-p", "--output-format", "json"];
    // 기본적으로는 어떤 도구도 자동 승인하지 않는다(텍스트만 생성하는 기존 호출부와 동일하게 유지).
    // WebSearch처럼 명시적으로 허용한 도구만 --allowedTools로 프롬프트 승인 없이 쓸 수 있게 한다
    // (permission-prompts 대상이 없는 -p 모드에서는 승인 없이 도구를 쓰면 항상 거부되기 때문).
    if (allowedTools?.length) {
      args.push("--allowedTools", ...allowedTools);
    }
    // CLAUDE_BIN은 환경변수로 바뀔 수 있어 Turbopack이 정적으로 추적할 수 없다 — 의도된 것이므로 무시 처리.
    const child = spawn(/* turbopackIgnore: true */ CLAUDE_BIN, args, { shell: isWin });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ ok: false, error: `claude 호출이 ${timeoutSec}초 안에 끝나지 않았습니다.` });
    }, timeoutSec * 1000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: `claude 실행 실패: ${err.message}` });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        resolve({ ok: false, error: stderr.trim() || `claude가 종료코드 ${code}로 끝났습니다.` });
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed && typeof parsed.result === "string") {
          resolve({ ok: true, text: parsed.result });
        } else {
          resolve({ ok: true, text: stdout });
        }
      } catch {
        // 응답 JSON 파싱 실패 시 raw stdout을 그대로 반환 (폴백)
        resolve({ ok: true, text: stdout });
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function runClaude(
  prompt: string,
  opts?: { images?: string[]; system?: string; allowedTools?: string[] },
): Promise<ClaudeResult> {
  const settings = getSettings();
  await acquireSlot();
  try {
    let full = prompt;
    if (opts?.images?.length) {
      full += " " + opts.images.map((p) => `@${p}`).join(" ");
    }
    if (opts?.system) {
      full = `${opts.system}\n\n${full}`;
    }
    return await runClaudeRaw(full, settings.claudeTimeoutSec, opts?.allowedTools);
  } finally {
    releaseSlot();
  }
}

const JSON_INSTRUCTION =
  "반드시 유효한 JSON 만 출력하라. 설명/마크다운/코드펜스 없이 JSON 객체 또는 배열만 반환하라.";

function extractJson(text: string): string | null {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1]?.trim() ?? null;

  const firstBrace = text.search(/[{[]/);
  if (firstBrace === -1) return null;
  const open = text[firstBrace];
  const close = open === "{" ? "}" : "]";
  const lastClose = text.lastIndexOf(close);
  if (lastClose === -1 || lastClose < firstBrace) return null;
  return text.slice(firstBrace, lastClose + 1);
}

export async function runClaudeJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  opts?: { images?: string[]; system?: string; retries?: number; allowedTools?: string[] },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const retries = opts?.retries ?? 2;
  const system = [opts?.system, JSON_INSTRUCTION].filter(Boolean).join("\n\n");

  let lastError = "알 수 없는 오류";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await runClaude(prompt, {
      images: opts?.images,
      system,
      allowedTools: opts?.allowedTools,
    });
    if (!res.ok) {
      lastError = res.error;
      continue;
    }
    const jsonText = extractJson(res.text);
    if (!jsonText) {
      lastError = "응답에서 JSON을 찾지 못했습니다.";
      continue;
    }
    try {
      const parsed = JSON.parse(jsonText);
      const validated = schema.safeParse(parsed);
      if (validated.success) {
        return { ok: true, data: validated.data };
      }
      lastError = `스키마 검증 실패: ${validated.error.message}`;
    } catch (e) {
      lastError = `JSON 파싱 실패: ${(e as Error).message}`;
    }
  }
  return { ok: false, error: lastError };
}

export function checkClaude(): Promise<{ installed: boolean; version?: string }> {
  return new Promise((resolve) => {
    const child = spawn(/* turbopackIgnore: true */ CLAUDE_BIN, ["--version"], { shell: isWin });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve({ installed: false }));
    child.on("close", (code) => {
      if (code === 0 && out.trim()) resolve({ installed: true, version: out.trim() });
      else resolve({ installed: false });
    });
  });
}
