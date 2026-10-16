import { ChevronDown, ChevronUp, Clock3, Pencil, Trash2, CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import type { Task, TaskPriority } from "../../shared/task";
import {
  deleteTask,
  listTaskActivity,
  type TaskActivity,
  updateTask,
  scheduleTaskResume,
} from "./taskRepository";

const priorities: TaskPriority[] = ["urgent", "high", "medium", "low"];
const asDateTimeLocal = (value: Date) => {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};
const activityLabel: Record<string, string> = {
  created: "Created",
  started: "Started focus",
  resumed: "Resumed focus",
  paused: "Paused",
  completed: "Marked done",
  updated: "Task details updated",
  progress_note: "Progress note saved",
  progress_note_updated: "Progress note updated",
  moved_to_backlog: "Moved to backlog",
  moved_to_today: "Planned for today",
  carried_over_from_active: "Carried over as pending",
};

type Props = {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (task: Task) => void;
  onChanged: () => Promise<void>;
};

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  onChanged,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [progressNote, setProgressNote] = useState("");
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeLocal, setResumeLocal] = useState("");
  const loadActivity = async (taskId: string) => {
    try {
      setActivity(await listTaskActivity(taskId));
      setActivityLoaded(true);
    } catch (reason) {
      setError(String(reason));
    }
  };
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setProgressNote(task.lastProgressNote ?? "");
    setEditing(false);
    setConfirmDelete(false);
    setActivity([]);
    setActivityOpen(false);
    setActivityLoaded(false);
    setError(null);
    setResumeLocal(task.resumeAt ? asDateTimeLocal(new Date(task.resumeAt)) : "");
  }, [task]);
  if (!task) return null;
  const save = async () => {
    try {
      const updatedTask = await updateTask({
        id: task.id,
        title,
        description: description || undefined,
        priority,
        ...(task.status === "pending" ? { progressNote } : {}),
      });
      onTaskUpdated(updatedTask);
      setEditing(false);
      setActivityLoaded(false);
      if (activityOpen) await loadActivity(task.id);
      await onChanged();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const remove = async () => {
    try {
      await deleteTask(task.id);
      onOpenChange(false);
      await onChanged();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const toggleActivity = async () => {
    const nextOpen = !activityOpen;
    setActivityOpen(nextOpen);
    if (nextOpen && !activityLoaded) await loadActivity(task.id);
  };
  const saveSchedule = async () => {
    try {
      if (resumeLocal && new Date(resumeLocal).getTime() <= Date.now()) throw new Error("Choose a future date and time.");
      const updated = await scheduleTaskResume(task.id, resumeLocal ? new Date(resumeLocal).toISOString() : null);
      onTaskUpdated(updated);
      await onChanged();
    } catch (reason) { setError(String(reason)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogTitle className="text-xl font-bold">Task details</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate-500">
          View context, progress and the task activity log.
        </DialogDescription>
        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-4">
          {confirmDelete ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="font-bold text-rose-900">Delete this task?</p>
              <p className="mt-2 text-sm leading-6 text-rose-700">
                This permanently removes the task and its related notes,
                interruptions and history.
              </p>
              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep task
                </Button>
                <Button
                  className="flex-1 bg-rose-600 hover:bg-rose-700"
                  onClick={() => void remove()}
                >
                  Delete permanently
                </Button>
              </div>
            </div>
          ) : editing ? (
            <>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-violet-300"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Description"
              />
              {task.status === "pending" && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Progress note when paused
                  </label>
                  <textarea
                    value={progressNote}
                    onChange={(event) => setProgressNote(event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="Add the context you need to resume this task later..."
                  />
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {priorities.map((item) => (
                  <button
                    key={item}
                    onClick={() => setPriority(item)}
                    className={`rounded-lg py-2 text-xs font-bold capitalize ${priority === item ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => void save()}>
                  Save changes
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Task
                </p>
                <h3 className="mt-1 text-lg font-bold">{task.title}</h3>
              </div>
              <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                {task.description || "No description added."}
              </p>
              {task.status === "pending" && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Saved progress note
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {task.lastProgressNote ||
                      "No progress note was saved when this task was paused."}
                  </p>
                </section>
              )}
              {task.status === "pending" && (
                <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700"><CalendarClock size={14} /> Resume schedule</p>
                  <p className="mt-2 text-sm text-violet-900">{task.resumeAt ? `Scheduled for ${new Date(task.resumeAt).toLocaleString()}. Reminders stay quiet until then.` : "Available now — normal pending reminders apply."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input type="datetime-local" value={resumeLocal} onChange={(event) => setResumeLocal(event.target.value)} className="h-9 rounded-lg border border-violet-200 bg-white px-2 text-sm" />
                    <Button size="sm" onClick={() => void saveSchedule()}>{resumeLocal ? "Save schedule" : "Cancel schedule"}</Button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => setResumeLocal(asDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)))} className="text-xs font-bold text-violet-700 hover:underline">This afternoon</button>
                    <button type="button" onClick={() => setResumeLocal(asDateTimeLocal(new Date(Date.now() + 6 * 60 * 60 * 1000)))} className="text-xs font-bold text-violet-700 hover:underline">This evening</button>
                  </div>
                </section>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-violet-100 text-violet-700">
                  {task.status.replace("_", " ")}
                </Badge>
                <Badge className="bg-slate-100 text-slate-600">
                  {task.priority}
                </Badge>
              </div>
              <section className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => void toggleActivity()}
                  className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-100"
                  aria-expanded={activityOpen}
                >
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <Clock3 size={14} />
                    Activity log
                  </span>
                  {activityOpen ? (
                    <ChevronUp size={17} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={17} className="text-slate-400" />
                  )}
                </button>
                {activityOpen &&
                  (activity.length ? (
                    <ol className="mt-3 space-y-3 px-4 pb-4">
                      {activity.slice(0, 8).map((item) => (
                        <li key={item.id} className="text-sm">
                          <p className="font-medium text-slate-700">
                            {activityLabel[item.kind] ?? item.kind}
                          </p>
                          {item.detail && (
                            <p className="mt-0.5 text-slate-500">
                              {item.detail}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-slate-400">
                            {new Date(item.occurredAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="px-4 pb-4 text-sm text-slate-400">
                      No activity recorded yet.
                    </p>
                  ))}
              </section>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEditing(true)}
              >
                <Pencil size={16} />
                Edit task
              </Button>
              <Button
                variant="ghost"
                className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
                Delete task
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
