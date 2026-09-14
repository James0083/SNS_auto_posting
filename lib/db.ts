import Database from "better-sqlite3";
import { DB_PATH, ensureDataDirs } from "@/lib/paths";

// Next.js dev의 HMR이 모듈을 여러 번 평가해도 커넥션이 늘어나지 않도록 globalThis에 캐싱한다.
// (네이버 문서 7-17과 동일한 함정)
declare global {
  // eslint-disable-next-line no-var
  var __appDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  ensureDataDirs();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_kind TEXT NOT NULL,       -- 'ig' | 'reels'
      job_id INTEGER NOT NULL,
      level TEXT NOT NULL,          -- 'info' | 'warn' | 'error'
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 인스타그램 게시물 트랙
    CREATE TABLE IF NOT EXISTS ig_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      mode TEXT NOT NULL,                 -- 'auto' | 'experience' | 'branding'
      status TEXT NOT NULL DEFAULT 'pending', -- pending|generating|done|failed
      caption TEXT,
      hashtags_json TEXT,
      carousel INTEGER NOT NULL DEFAULT 0,
      slide_count INTEGER NOT NULL DEFAULT 1,
      image_style TEXT NOT NULL DEFAULT 'photo',
      photo_source TEXT NOT NULL DEFAULT 'ai', -- 'ai'(자동 생성) | 'upload'(직접 촬영한 사진 변환)
      source_image_paths_json TEXT,       -- photo_source='upload'일 때 업로드 원본 경로 배열
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ig_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ig_post_id INTEGER NOT NULL REFERENCES ig_posts(id) ON DELETE CASCADE,
      slide_index INTEGER NOT NULL,
      role TEXT NOT NULL,                 -- cover|body|cta
      local_path TEXT,
      source_site TEXT NOT NULL DEFAULT 'ai', -- 'ai' | 'upload'
      source_path TEXT,                   -- photo_source='upload'일 때, 변환 전 원본 캡처 이미지 경로
      verdict_ok INTEGER,
      verdict_reason TEXT,
      gen_prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ig_titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ig_post_id INTEGER NOT NULL REFERENCES ig_posts(id) ON DELETE CASCADE,
      candidate_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      chosen INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 릴스 각색 트랙
    CREATE TABLE IF NOT EXISTS reels_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending|generating|done|failed
      input_type TEXT NOT NULL,               -- 'text' | 'image' | 'both'
      source_text TEXT,
      source_image_paths_json TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reels_titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reels_job_id INTEGER NOT NULL REFERENCES reels_jobs(id) ON DELETE CASCADE,
      candidate_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      chosen INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reels_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reels_job_id INTEGER NOT NULL REFERENCES reels_jobs(id) ON DELETE CASCADE,
      title_id INTEGER REFERENCES reels_titles(id),
      body_text TEXT NOT NULL,
      cta_included_json TEXT NOT NULL,
      qc_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reels_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reels_job_id INTEGER NOT NULL REFERENCES reels_jobs(id) ON DELETE CASCADE,
      slide_index INTEGER NOT NULL,
      local_path TEXT,
      gen_prompt TEXT,
      verdict_ok INTEGER,
      verdict_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // --- 이후 컬럼 추가는 ALTER TABLE로 (migrate()는 CREATE IF NOT EXISTS만 하므로 기존 DB엔 반영 안 됨) ---

  // 인스타그램 게시물 트랙: 해외 콘텐츠 각색 + 배치
  addColumn(db, "ig_posts", "content_source", "content_source TEXT NOT NULL DEFAULT 'keyword'"); // 'keyword' | 'adapt'
  addColumn(db, "ig_posts", "source_text", "source_text TEXT"); // content_source='adapt'일 때 각색 원문
  addColumn(db, "ig_posts", "batch_id", "batch_id TEXT"); // 한 번에 제출한 배치 그룹 id (단건이면 NULL)
  // 참고: content_source='adapt'이면 source_image_paths_json은 "각색 참고용 원본 캡처" 경로다.
  // adapt는 항상 photo_source='ai'이므로 photo_source='upload'(직접 촬영 사진 변환)와 상호배타적.

  // 릴스 각색 트랙: 배치
  addColumn(db, "reels_jobs", "batch_id", "batch_id TEXT");

  // 이미지 편집기(로고·그라데이션·제목 합성) 결과. 원본(local_path)은 그대로 두고
  // 합성본만 별도 파일·컬럼에 추가한다 — 둘 다 다운로드 zip에 포함하기 위함.
  addColumn(db, "ig_images", "composited_path", "composited_path TEXT");
}

// 컬럼이 없을 때만 ALTER TABLE ADD COLUMN 실행 (SQLite는 IF NOT EXISTS를 컬럼에 지원하지 않음).
function addColumn(db: Database.Database, table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export function getDb(): Database.Database {
  if (!globalThis.__appDb) {
    globalThis.__appDb = createDb();
  }
  return globalThis.__appDb;
}
