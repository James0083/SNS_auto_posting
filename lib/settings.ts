import { getDb } from "@/lib/db";
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from "@/config";

type Settings = typeof DEFAULT_SETTINGS;
type SettingsKey = keyof Settings;

export function getSettings(): Settings {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

function clamp(key: SettingsKey, value: number): number {
  const limits = SETTINGS_LIMITS[key];
  if (!limits) return value;
  return Math.min(limits.max, Math.max(limits.min, value));
}

export function setSetting(key: SettingsKey, value: number): void {
  const clamped = clamp(key, value);
  const db = getDb();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, JSON.stringify(clamped));
}

export function resetSettings(): void {
  getDb().prepare("DELETE FROM settings").run();
}

export { SETTINGS_LIMITS as LIMITS };
