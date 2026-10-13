import { Archive, CheckCircle2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import type { Task } from "../../shared/task";
import {
  deleteTask,
  listCarryoverTasks,
  markTaskDone,
  moveTaskToBacklog,
  moveTaskToToday,
} from "../tasks/taskRepository";

type Props = {
  date: string;
  queueSize: number;
  onChanged: () => Promise<void>;
};

export function DailyCarryoverDialog({ date, queueSize, onChanged }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const items = await listCarryoverTasks(date);
      setTasks(items);
      setOpen(items.length > 0);
      setError(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [date]);

  const apply = async (
    task: Task,
    action: "today" | "backlog" | "done" | "delete",
  ) => {
    try {
      if (action === "today") {
        await moveTaskToToday(task.id, date, queueSize + tasks.indexOf(task));
      } else if (action === "backlog") {
        await moveTaskToBacklog(task.id);
      } else if (action === "done") {
        await markTaskDone(task.id);
      } else {
        await deleteTask(task.id);
      }
      const remaining = tasks.filter((item) => item.id !== task.id);
      setTasks(remaining);
      if (!remaining.length) setOpen(false);
      await onChanged();
    } catch (reason) {
      setError(String(reason));
    }
  };

  if (loading || !open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogTitle className="text-xl font-bold">Review unfinished work</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate-500">
          These tasks are from an earlier day. Decide where each one belongs
          before planning today.
        </DialogDescription>
        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-3">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-800">{task.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Planned for {task.plannedDate ?? "an earlier day"}
                    {task.lastProgressNote
                      ? ` · Last note: ${task.lastProgressNote}`
                      : ""}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  {task.status === "pending" ? "Pending" : "To do"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => void apply(task, "today")}
                >
                  Keep for today
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void apply(task, "backlog")}
                >
                  <Archive size={14} /> Backlog
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void apply(task, "done")}
                >
                  <CheckCircle2 size={14} /> Done
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => void apply(task, "delete")}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
