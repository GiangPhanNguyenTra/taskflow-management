import { invoke } from "@tauri-apps/api/core";
import type { Task, TaskLocation, TaskPriority } from "../../shared/task";

export type TaskActivity = {
  id: string;
  kind: string;
  occurredAt: string;
  detail: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority: TaskPriority;
  location: TaskLocation;
  plannedDate?: string;
  queuePosition?: number;
};
export type UpdateTaskInput = {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  progressNote?: string;
};

export const listTodayTasks = (date: string) =>
  invoke<Task[]>("list_today_tasks", { date });
export const createTask = (input: CreateTaskInput) =>
  invoke<Task>("create_task", { input });
export const startTask = (taskId: string) =>
  invoke<Task>("start_task", { taskId });
export const switchTask = (nextTaskId: string, progressNote?: string) =>
  invoke<Task>("switch_task", { input: { nextTaskId, progressNote } });
export const completeTask = (taskId: string) =>
  invoke<void>("complete_task", { taskId });
export const markTaskDone = (taskId: string) =>
  invoke<void>("mark_task_done", { taskId });
export const reorderTasks = (taskIds: string[]) =>
  invoke<void>("reorder_tasks", { input: { taskIds } });
export const updateTask = (input: UpdateTaskInput) =>
  invoke<Task>("update_task", { input });
export const deleteTask = (taskId: string) =>
  invoke<void>("delete_task", { taskId });
export const listBacklogTasks = () => invoke<Task[]>("list_backlog_tasks");
export const listHistoryTasks = () => invoke<Task[]>("list_history_tasks");
export type HistoryQuery = {
  startAt: string;
  endAt: string;
  startDate: string;
  endDate: string;
  priority?: TaskPriority;
  status?: "todo" | "in_progress" | "pending" | "done";
  search?: string;
  sort?: "completed_newest" | "completed_oldest" | "priority_highest" | "priority_lowest";
  page: number;
  pageSize: number;
  timezoneOffsetMinutes: number;
};
export type HistorySummary = {
  trend: { date: string; count: number }[];
  priorityDistribution: { priority: TaskPriority; count: number }[];
  statusDistribution: { status: "todo" | "in_progress" | "pending" | "done"; count: number }[];
};
export type HistoryPage = { tasks: Task[]; total: number; summary: HistorySummary };
export const listHistoryPage = (query: HistoryQuery) =>
  invoke<HistoryPage>("list_history_page", { query });
export const listTaskActivity = (taskId: string) =>
  invoke<TaskActivity[]>("list_task_activity", { taskId });
export const listCarryoverTasks = (date: string) =>
  invoke<Task[]>("list_carryover_tasks", { date });
export const moveTaskToBacklog = (taskId: string) =>
  invoke<void>("move_task_to_backlog", { taskId });
export const moveTaskToToday = (
  taskId: string,
  date: string,
  queuePosition: number,
) => invoke<void>("move_task_to_today", { taskId, date, queuePosition });
