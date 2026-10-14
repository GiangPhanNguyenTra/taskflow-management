import { invoke } from "@tauri-apps/api/core";
import type { ThemeId } from "./theme";

export type AppSettings = {
  remindersEnabled: boolean;
  reminderIntervalMinutes: number;
  retentionDays: number;
  quickAddShortcut: string;
  launchAtLogin: boolean;
  theme: ThemeId;
};

export const getAppSettings = () => invoke<AppSettings>("get_app_settings");
export const saveAppSettings = (settings: AppSettings) =>
  invoke<AppSettings>("save_app_settings", { settings });
export const runRetentionCleanup = (retentionDays: number) =>
  invoke<number>("run_retention_cleanup", { retentionDays });
