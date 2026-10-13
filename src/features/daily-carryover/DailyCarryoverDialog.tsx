import {
  Archive,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  Circle,
  ClipboardCheck,
  Clock3,
  Info,
  ListTodo,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type CarryoverAction = "today" | "backlog" | "done" | "delete";
type Props = {
  date: string;
  queueSize: number;
  onChanged: () => Promise<void>;
};
const actions: { id: CarryoverAction; label: string; icon: typeof Archive }[] =
  [
    { id: "today", label: "Keep for today", icon: CalendarDays },
    { id: "backlog", label: "Backlog", icon: Archive },
    { id: "done", label: "Done", icon: CheckCircle2 },
    { id: "delete", label: "Delete", icon: Trash2 },
  ];

export function DailyCarryoverDialog({ date, queueSize, onChanged }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<CarryoverAction>("today");
  const summary = useMemo(
    () => ({
      pending: tasks.filter((task) => task.status === "pending").length,
      todo: tasks.filter((task) => task.status === "todo").length,
    }),
    [tasks],
  );

  const load = async () => {
    setLoading(true);
    try {
      const items = await listCarryoverTasks(date);
      setTasks(items);
      setSelectedIds(new Set(items.map((task) => task.id)));
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
  const applyAction = async (
    task: Task,
    action: CarryoverAction,
    position: number,
  ) => {
    if (action === "today")
      await moveTaskToToday(task.id, date, queueSize + position);
    else if (action === "backlog") await moveTaskToBacklog(task.id);
    else if (action === "done") await markTaskDone(task.id);
    else await deleteTask(task.id);
  };
  const afterUpdate = async (processed: Set<string>) => {
    const remaining = tasks.filter((task) => !processed.has(task.id));
    setTasks(remaining);
    setSelectedIds(
      (current) => new Set([...current].filter((id) => !processed.has(id))),
    );
    if (!remaining.length) setOpen(false);
    await onChanged();
  };
  const applyOne = async (task: Task, action: CarryoverAction) => {
    setApplying(true);
    setError(null);
    try {
      await applyAction(task, action, tasks.indexOf(task));
      await afterUpdate(new Set([task.id]));
    } catch (reason) {
      setError(String(reason));
    } finally {
      setApplying(false);
    }
  };
  const applySelected = async () => {
    const selected = tasks.filter((task) => selectedIds.has(task.id));
    if (!selected.length) return;
    setApplying(true);
    setError(null);
    const processed = new Set<string>();
    try {
      for (const [index, task] of selected.entries()) {
        await applyAction(task, bulkAction, index);
        processed.add(task.id);
      }
      await afterUpdate(processed);
    } catch (reason) {
      await afterUpdate(processed);
      setError(`Some tasks were updated. ${String(reason)}`);
    } finally {
      setApplying(false);
    }
  };
  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const toggleAll = () =>
    setSelectedIds(
      allSelected ? new Set() : new Set(tasks.map((task) => task.id)),
    );
  const toggleTask = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  if (loading || !open) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[94vh] max-w-[50rem] overflow-y-auto p-0">
        <div className="p-6 pb-4 sm:p-7">
          <div className="flex gap-4 pr-8">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600">
              <ClipboardCheck size={28} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Review unfinished work
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-slate-500">
                These tasks are from an earlier day. Decide where each one
                belongs before planning today.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <SummaryCard
              icon={<ListTodo size={20} />}
              value={tasks.length}
              label="unfinished"
              tone="violet"
            />
            <SummaryCard
              icon={<Clock3 size={20} />}
              value={summary.pending}
              label="pending"
              tone="amber"
            />
            <SummaryCard
              icon={<Circle size={20} />}
              value={summary.todo}
              label="to do"
              tone="sky"
            />
          </div>
          {summary.pending > 0 && (
            <div className="mt-3 flex gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm">
              <CheckSquare2
                size={18}
                className="mt-0.5 shrink-0 text-violet-600"
              />
              <p className="leading-5 text-violet-900">
                <strong>
                  Your previously focused task has been safely converted to
                  Pending.
                </strong>
                <br />
                <span className="text-xs text-violet-700">
                  You can choose its destination below, or keep it for today.
                </span>
              </p>
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/60 p-2">
            <button
              type="button"
              onClick={toggleAll}
              disabled={applying}
              className="flex items-center gap-2 px-2 text-sm font-bold text-violet-800 disabled:opacity-50"
            >
              <input
                type="checkbox"
                checked={allSelected}
                readOnly
                className="h-4 w-4 accent-violet-600"
              />
              {selectedIds.size} selected
            </button>
            <span className="hidden h-5 border-l border-violet-200 sm:block" />
            {actions.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                disabled={!selectedIds.size || applying}
                onClick={() => setBulkAction(id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition disabled:opacity-50 ${bulkAction === id ? (id === "delete" ? "bg-rose-600 text-white shadow-sm" : "bg-violet-600 text-white shadow-sm") : id === "delete" ? "bg-white text-rose-600 ring-1 ring-rose-100" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50"}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2.5">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                selected={selectedIds.has(task.id)}
                disabled={applying}
                onToggle={() => toggleTask(task.id)}
                onApply={applyOne}
              />
            ))}
          </div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-violet-100 bg-gradient-to-r from-slate-50 to-violet-50 px-5 py-3">
          <p className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <Info size={14} />
            Review individually or apply one action to your selection.
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={applying}
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={!selectedIds.size || applying}
              onClick={() => void applySelected()}
            >
              {applying && <LoaderCircle size={14} className="animate-spin" />}
              Apply selected ({selectedIds.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: "violet" | "amber" | "sky";
}) {
  const toneClass = {
    violet: "bg-violet-100 text-violet-600",
    amber: "bg-amber-100 text-amber-600",
    sky: "bg-sky-100 text-sky-600",
  }[tone];
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
      <span
        className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-slate-800">{value}</p>
        <p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  selected,
  disabled,
  onToggle,
  onApply,
}: {
  task: Task;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onApply: (task: Task, action: CarryoverAction) => Promise<void>;
}) {
  return (
    <article
      className={`rounded-xl border bg-white p-3.5 shadow-sm transition ${selected ? "border-violet-300 ring-1 ring-violet-100" : "border-slate-100"}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
          aria-label={`Select ${task.title}`}
          className="mt-1 h-4 w-4 accent-violet-600"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-slate-800">
              {task.title}
            </h3>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${task.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}
            >
              {task.status === "pending" ? (
                <Clock3 size={12} />
              ) : (
                <Circle size={11} />
              )}
              {task.status === "pending" ? "Pending" : "To do"}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
            <CalendarDays size={12} />
            Planned for {task.plannedDate ?? "an earlier day"}
            {task.lastProgressNote && (
              <>
                <span>·</span>
                <span className="truncate">
                  Last note: {task.lastProgressNote}
                </span>
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SmallAction
              icon={<CalendarDays size={13} />}
              label="Keep for today"
              primary
              onClick={() => void onApply(task, "today")}
              disabled={disabled}
            />
            <SmallAction
              icon={<Archive size={13} />}
              label="Backlog"
              onClick={() => void onApply(task, "backlog")}
              disabled={disabled}
            />
            <SmallAction
              icon={<CheckCircle2 size={13} />}
              label="Done"
              onClick={() => void onApply(task, "done")}
              disabled={disabled}
            />
            <SmallAction
              icon={<Trash2 size={13} />}
              label="Delete"
              danger
              onClick={() => void onApply(task, "delete")}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function SmallAction({
  icon,
  label,
  primary,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold transition disabled:opacity-50 ${primary ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700" : danger ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
      {...props}
    >
      {icon}
      {label}
    </button>
  );
}
