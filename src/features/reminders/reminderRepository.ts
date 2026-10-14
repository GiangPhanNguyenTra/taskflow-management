import { invoke } from "@tauri-apps/api/core";

export type PinnedReminderTask = {
  id: string;
  title: string;
  detail: string | null;
};
export type PinnedReminderPayload = {
  active: PinnedReminderTask | null;
  pending: PinnedReminderTask | null;
};

export const updatePinnedReminder = (payload: PinnedReminderPayload | null) =>
  invoke<void>("update_pinned_reminder", { payload });
export const setPinnedReminderCompact = (compact: boolean) =>
  invoke<void>("set_pinned_reminder_compact", { compact });
export const setPinnedReminderSwitching = (switching: boolean) =>
  invoke<void>("set_pinned_reminder_switching", { switching });
export const setPinnedReminderContentHeight = (height: number) =>
  invoke<void>("set_pinned_reminder_content_height", { height });
export const isReminderSnoozed = (taskId: string) =>
  invoke<boolean>("is_reminder_snoozed", { taskId });
export const snoozePinnedReminder = (taskId: string, minutes = 30) =>
  invoke<void>("snooze_pinned_reminder", { taskId, minutes });
export const completeReminderActive = (taskId: string) =>
  invoke<void>("complete_reminder_active", { taskId });
export const resumeReminderTask = (
  pendingTaskId: string,
  activeTaskId?: string,
  currentDisposition?: "pending" | "done",
  progressNote?: string,
) =>
  invoke<void>("resume_reminder_task", {
    pendingTaskId,
    activeTaskId,
    currentDisposition,
    progressNote,
  });
export const getPinnedReminder = () =>
  invoke<PinnedReminderPayload | null>("get_pinned_reminder");
export const hidePinnedReminder = () => invoke<void>("hide_pinned_reminder");
export const showPinnedReminder = () => invoke<void>("show_pinned_reminder");
export const openMainWindow = () => invoke<void>("open_main_window");
