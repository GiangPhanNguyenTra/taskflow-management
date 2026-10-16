import {
  Archive,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  Circle,
  ClipboardCheck,
  Clock3,
  ChevronDown,
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
  scheduleTaskResume,
} from "../tasks/taskRepository";

type CarryoverAction = "today" | "backlog" | "done" | "delete";
type CarryoverDecision = { action: CarryoverAction; resumeAt?: string };
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
  const [decisions, setDecisions] = useState<Record<string, CarryoverDecision>>({});
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
      setDecisions({});
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
    decision: CarryoverDecision,
    position: number,
  ) => {
    const { action, resumeAt } = decision;
    if (action === "today")
      await moveTaskToToday(task.id, date, queueSize + position);
    else if (action === "backlog") await moveTaskToBacklog(task.id);
    else if (action === "done") await markTaskDone(task.id);
    else await deleteTask(task.id);
    if (action === "today" && resumeAt)
      await scheduleTaskResume(task.id, resumeAt);
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
  const stage = (taskId: string, decision: CarryoverDecision) =>
    setDecisions((current) => ({ ...current, [taskId]: decision }));
  const applySelected = async () => {
    const selected = tasks.filter((task) => selectedIds.has(task.id));
    if (!selected.length) return;
    setApplying(true);
    setError(null);
    const processed = new Set<string>();
    try {
      for (const [index, task] of selected.entries()) {
        await applyAction(task, decisions[task.id] ?? { action: bulkAction }, index);
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
                decision={decisions[task.id]}
                onStage={stage}
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
  decision,
  onStage,
}: {
  task: Task;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  decision?: CarryoverDecision;
  onStage: (taskId: string, decision: CarryoverDecision) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickTimeOpen, setPickTimeOpen] = useState(false);
  const [resumeAt, setResumeAt] = useState("");
  const keepScheduled = (when: Date) => {
    onStage(task.id, { action: "today", resumeAt: when.toISOString() });
  };
  const chooseTime = (hours: number) => {
    const when = new Date();
    when.setHours(hours, 0, 0, 0);
    if (when <= new Date()) {
      setPickTimeOpen(true);
      return;
    }
    setMenuOpen(false);
    keepScheduled(when);
  };
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
            <div className="relative inline-flex overflow-visible rounded-lg shadow-sm">
              <button type="button" disabled={disabled} onClick={() => onStage(task.id, { action: "today" })} className="inline-flex h-7 items-center gap-1 rounded-l-lg bg-violet-600 px-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"><CalendarDays size={13} />Keep for today</button>
              <button type="button" aria-label="Choose when to resume" disabled={disabled} onClick={() => setMenuOpen((open) => !open)} className="grid h-7 w-7 place-items-center rounded-r-lg border-l border-violet-400 bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-50"><ChevronDown size={14} /></button>
              {menuOpen && (
                <div className="absolute left-0 top-8 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <MenuAction icon={<Circle size={13} />} label="Available now" description="Keep ready to resume" onClick={() => { setMenuOpen(false); onStage(task.id, { action: "today" }); }} />
                  <MenuAction icon={<Clock3 size={13} />} label="This afternoon" description="Resume at 2:00 PM" onClick={() => chooseTime(14)} />
                  <MenuAction icon={<Clock3 size={13} />} label="Later today" description="Resume at 6:00 PM" onClick={() => chooseTime(18)} />
                  <MenuAction icon={<CalendarDays size={13} />} label="Pick date & time…" onClick={() => setPickTimeOpen(true)} />
                  {pickTimeOpen && <div className="mt-1 border-t border-slate-100 p-1.5"><input aria-label="Resume date and time" type="datetime-local" value={resumeAt} onChange={(event) => setResumeAt(event.target.value)} className="h-8 w-full rounded-lg border border-slate-200 px-2 text-[11px]" /><button type="button" disabled={!resumeAt} onClick={() => { const when = new Date(resumeAt); if (when > new Date()) { setMenuOpen(false); keepScheduled(when); } }} className="mt-1.5 w-full rounded-lg bg-violet-600 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">Keep for later</button></div>}
                </div>
              )}
            </div>
            <SmallAction
              icon={<Archive size={13} />}
              label="Backlog"
              onClick={() => onStage(task.id, { action: "backlog" })}
              disabled={disabled}
            />
            <SmallAction
              icon={<CheckCircle2 size={13} />}
              label="Done"
              onClick={() => onStage(task.id, { action: "done" })}
              disabled={disabled}
            />
            <SmallAction
              icon={<Trash2 size={13} />}
              label="Delete"
              danger
              onClick={() => onStage(task.id, { action: "delete" })}
              disabled={disabled}
            />
          </div>
          {decision && (
            <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${decision.action === "today" ? "bg-violet-50 text-violet-700" : decision.action === "delete" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
              {decision.action === "today" && decision.resumeAt ? <><Clock3 size={12} /> Resume at {new Date(decision.resumeAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</> : decision.action === "today" ? "Available now" : decision.action === "backlog" ? "Move to backlog" : decision.action === "done" ? "Mark as done" : "Delete task"}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function MenuAction({ icon, label, description, onClick }: { icon: React.ReactNode; label: string; description?: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-violet-50"><span className="text-violet-600">{icon}</span><span><span className="block text-xs font-bold text-slate-700">{label}</span>{description && <span className="block text-[10px] text-slate-400">{description}</span>}</span></button>;
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
