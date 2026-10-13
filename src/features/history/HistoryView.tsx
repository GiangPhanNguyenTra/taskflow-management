import { CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import type { Task } from "../../shared/task";
import { TaskDetailDialog } from "../tasks/TaskDetailDialog";
import { listHistoryTasks } from "../tasks/taskRepository";

export function HistoryView({ onChanged }: { onChanged: () => Promise<void> }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTasks(await listHistoryTasks());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refreshAfterChange = async () => {
    await load();
    await onChanged();
  };

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-bold tracking-[0.18em] text-violet-600">
          WORK LOG
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">History</h1>
        <p className="mt-2 text-slate-500">
          Completed and archived work, kept locally on this device.
        </p>
      </div>
      {loading ? (
        <div className="grid place-items-center rounded-3xl bg-white py-24">
          <LoaderCircle className="animate-spin text-violet-500" />
        </div>
      ) : tasks.length ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-violet-200"
            >
              <CheckCircle2 className="text-emerald-500" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="truncate text-left font-bold hover:text-violet-700 hover:underline"
                >
                  {task.title}
                </button>
                <p className="mt-1 text-sm text-slate-500">
                  {task.completedAt
                    ? `Completed ${new Date(task.completedAt).toLocaleString()}`
                    : "Archived"}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700">Done</Badge>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-14 text-center">
          <Clock3 className="mx-auto text-violet-500" />
          <h2 className="mt-4 font-bold">No history yet.</h2>
          <p className="mt-1 text-sm text-slate-500">
            Completed tasks will appear here.
          </p>
        </div>
      )}
      <TaskDetailDialog
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdated={setSelectedTask}
        onChanged={refreshAfterChange}
      />
    </section>
  );
}
