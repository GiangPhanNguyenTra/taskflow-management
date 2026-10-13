export const TASK_STATUSES = ["todo", "in_progress", "pending", "done", "obsolete"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskLocation = "today" | "backlog";
export interface Task { id: string; title: string; description: string | null; priority: TaskPriority; status: TaskStatus; location: TaskLocation; plannedDate: string | null; queuePosition: number; lastProgressNote: string | null; createdAt: string; updatedAt: string; completedAt: string | null; obsoleteAt: string | null; }
export const isActionableTask = (status: TaskStatus) => status === "todo" || status === "pending";
