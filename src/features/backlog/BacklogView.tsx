import { ArchiveRestore, Inbox, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import type { Task } from "../../shared/task";
import { listBacklogTasks, moveTaskToToday } from "../tasks/taskRepository";

export function BacklogView({
  today,
  queueSize,
  onChanged,
}: {
  today: string;
  queueSize: number;
  onChanged: () => Promise<void>;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    try {
      setTasks(await listBacklogTasks());
      setError(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const move = async (task: Task) => {
    try {
      await moveTaskToToday(task.id, today, queueSize + tasks.indexOf(task));
      await load();
      await onChanged();
    } catch (reason) {
      setError(String(reason));
    }
  };
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-bold tracking-[0.18em] text-violet-600">
          PLANNING SPACE
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Backlog</h1>
        <p className="mt-2 text-slate-500">
          Keep actionable work for later without losing its status or progress
          note.
        </p>
      </div>
      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {loading ? (
        <div className="grid place-items-center rounded-3xl bg-white py-24">
          <LoaderCircle className="animate-spin text-violet-500" />
        </div>
      ) : tasks.length ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Inbox size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{task.title}</h2>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {task.lastProgressNote ||
                    task.description ||
                    "No saved context"}
                </p>
              </div>
              <Button variant="outline" onClick={() => void move(task)}>
                <ArchiveRestore size={16} />
                Move to Today
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-14 text-center">
          <Inbox className="mx-auto text-violet-500" />
          <h2 className="mt-4 font-bold">Your backlog is clear.</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tasks moved out of today will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
