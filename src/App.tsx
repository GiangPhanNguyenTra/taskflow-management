import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Inbox,
  ListTodo,
  LoaderCircle,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./components/ui/dialog";
import { TaskDetailDialog } from "./features/tasks/TaskDetailDialog";
import { BacklogView } from "./features/backlog/BacklogView";
import { DailyCarryoverDialog } from "./features/daily-carryover/DailyCarryoverDialog";
import { HistoryView } from "./features/history/HistoryView";
import {
  completeTask,
  createTask,
  deleteTask,
  listTodayTasks,
  markTaskDone,
  moveTaskToBacklog,
  reorderTasks,
  startTask,
  switchTask,
} from "./features/tasks/taskRepository";
import { cn } from "./lib/utils";
import type { Task, TaskPriority } from "./shared/task";

type DraftTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  startNow: boolean;
};
const today = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const priorities: TaskPriority[] = ["urgent", "high", "medium", "low"];
const priorityStyle: Record<TaskPriority, string> = {
  urgent: "bg-rose-100 text-rose-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-sky-100 text-sky-700",
  low: "bg-slate-100 text-slate-600",
};
const newDraft = (title: string): DraftTask => ({
  id: crypto.randomUUID(),
  title,
  priority: "medium",
  startNow: false,
});

function SortableTask({
  task,
  onStart,
  onDone,
  onDelete,
  onMoveToBacklog,
  onOpen,
  isRecommended,
}: {
  task: Task;
  onStart: (task: Task) => void;
  onDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMoveToBacklog: (task: Task) => void;
  onOpen: (task: Task) => void;
  isRecommended: boolean;
}) {
  const sortable = useSortable({ id: task.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const statusLabel = task.status === "pending" ? "Pending" : "To do";
  return (
    <article
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-violet-200",
        isRecommended
          ? "border-violet-300 bg-violet-50/40 ring-2 ring-violet-100"
          : "border-slate-100",
        sortable.isDragging && "opacity-50 shadow-lg",
      )}
    >
      <button
        type="button"
        title="Drag to reorder"
        className="touch-none cursor-grab rounded-lg p-2 text-slate-300 hover:bg-violet-50 hover:text-violet-600 active:cursor-grabbing"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical size={19} />
      </button>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
        <ListTodo size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(task)}
            className="truncate text-left font-semibold hover:text-violet-700 hover:underline"
          >
            {task.title}
          </button>
          {isRecommended && (
            <Badge className="bg-violet-600 text-white">✦ Recommended</Badge>
          )}
          <Badge className={priorityStyle[task.priority]}>
            {task.priority}
          </Badge>
          {task.status === "pending" && (
            <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-slate-400">
          {task.lastProgressNote || task.description || "Ready when you are"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
          <span className="flex h-9 items-center px-3 text-sm font-semibold text-slate-600">
            {statusLabel}
          </span>
          <button
            type="button"
            aria-label="Change task status"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid w-9 place-items-center border-l border-slate-200 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <ChevronDown size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onStart(task);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
              >
                {task.status === "pending" ? "Resume now" : "Start now"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDone(task);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Mark as done
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onMoveToBacklog(task);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Move to backlog
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          title="Delete task"
          onClick={() => onDelete(task)}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  );
}

function SortableDraft({
  draft,
  update,
  remove,
}: {
  draft: DraftTask;
  update: (patch: Partial<DraftTask>) => void;
  remove: () => void;
}) {
  const sortable = useSortable({ id: draft.id });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3",
        sortable.isDragging && "opacity-50",
      )}
    >
      <button
        className="cursor-grab text-slate-300"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical size={17} />
      </button>
      <input
        value={draft.title}
        onChange={(event) => update({ title: event.target.value })}
        className="h-9 min-w-36 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
      />
      <select
        value={draft.priority}
        onChange={(event) =>
          update({ priority: event.target.value as TaskPriority })
        }
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none"
      >
        {priorities.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => update({ startNow: !draft.startNow })}
        className={cn(
          "rounded-lg px-2.5 py-2 text-xs font-bold",
          draft.startNow
            ? "bg-violet-600 text-white"
            : "bg-white text-slate-500 ring-1 ring-slate-200",
        )}
      >
        {draft.startNow ? "Start now" : "Queue"}
      </button>
      <button
        type="button"
        onClick={remove}
        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"single" | "multiple">("single");
  const [multiStep, setMultiStep] = useState<"input" | "review">("input");
  const [singleTitle, setSingleTitle] = useState("");
  const [singleDescription, setSingleDescription] = useState("");
  const [singlePriority, setSinglePriority] = useState<TaskPriority>("medium");
  const [singleAction, setSingleAction] = useState<"queue" | "now">("queue");
  const [multipleInput, setMultipleInput] = useState("");
  const [view, setView] = useState<"today" | "backlog" | "history">("today");
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [switching, setSwitching] = useState<Task | null>(null);
  const [note, setNote] = useState("");
  const [pendingReorder, setPendingReorder] = useState<Task[] | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const active = tasks.find((task) => task.status === "in_progress");
  const queue = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "in_progress")
        .sort((a, b) => a.queuePosition - b.queuePosition),
    [tasks],
  );
  const recommended = active ? undefined : queue[0];
  const refresh = async () => {
    setLoading(true);
    try {
      setTasks(await listTodayTasks(today()));
      setError(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const closeModal = (open: boolean) => {
    setAddOpen(open);
    if (!open) setMultiStep("input");
  };
  const startOrSwitch = async (task: Task) => {
    if (active && active.id !== task.id) setSwitching(task);
    else {
      await startTask(task.id);
      await refresh();
    }
  };
  const submitSingle = async (event: FormEvent) => {
    event.preventDefault();
    if (!singleTitle.trim()) return;
    try {
      const task = await createTask({
        title: singleTitle.trim(),
        description: singleDescription.trim() || undefined,
        priority: singlePriority,
        location: "today",
        plannedDate: today(),
        queuePosition: queue.length,
      });
      setSingleTitle("");
      setSingleDescription("");
      setAddOpen(false);
      if (singleAction === "now") await startOrSwitch(task);
      else await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const reviewMultiple = () => {
    const next = multipleInput
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map(newDraft);
    if (next.length) {
      setDrafts(next);
      setMultiStep("review");
    }
  };
  const updateDraft = (id: string, patch: Partial<DraftTask>) =>
    setDrafts((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, ...patch, ...(patch.startNow ? {} : {}) }
          : item,
      ),
    );
  const selectStart = (id: string) =>
    setDrafts((current) =>
      current.map((item) => ({
        ...item,
        startNow: item.id === id ? !item.startNow : false,
      })),
    );
  const onDraftDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    if (!over || dragged.id === over.id) return;
    setDrafts((current) =>
      arrayMove(
        current,
        current.findIndex((item) => item.id === dragged.id),
        current.findIndex((item) => item.id === over.id),
      ),
    );
  };
  const createMultiple = async () => {
    const valid = drafts.filter((item) => item.title.trim());
    if (!valid.length) return;
    try {
      const created = [];
      for (const [index, item] of valid.entries())
        created.push({
          draft: item,
          task: await createTask({
            title: item.title.trim(),
            priority: item.priority,
            location: "today",
            plannedDate: today(),
            queuePosition: queue.length + index,
          }),
        });
      const selected = created.find((item) => item.draft.startNow);
      setMultipleInput("");
      setDrafts([]);
      setAddOpen(false);
      setMultiStep("input");
      if (selected) await startOrSwitch(selected.task);
      else await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const handleDone = async () => {
    if (!active) return;
    try {
      await completeTask(active.id);
      await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const handleMarkDone = async (task: Task) => {
    try {
      await markTaskDone(task.id);
      await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const handleDelete = async () => {
    if (!deletingTask) return;
    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
      await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const handleMoveToBacklog = async (task: Task) => {
    try {
      await moveTaskToBacklog(task.id);
      await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const switchTaskNow = async () => {
    if (!switching) return;
    try {
      await switchTask(switching.id, note);
      setNote("");
      setSwitching(null);
      await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const applyQueueOrder = async (updated: Task[]) => {
    const positioned = updated.map((task, index) => ({
      ...task,
      queuePosition: index,
    }));
    setTasks((current) => [
      ...current.filter((task) => task.status === "in_progress"),
      ...positioned,
    ]);
    try {
      await reorderTasks(positioned.map((task) => task.id));
    } catch {
      await refresh();
    }
  };
  const onQueueDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    if (!over || dragged.id === over.id) return;
    const oldIndex = queue.findIndex((task) => task.id === dragged.id);
    const newIndex = queue.findIndex((task) => task.id === over.id);
    const moved = queue[oldIndex];
    const target = queue[newIndex];
    const updated = arrayMove(queue, oldIndex, newIndex);
    if (
      moved.status === "todo" &&
      target.status === "pending" &&
      newIndex < oldIndex
    ) {
      setPendingReorder(updated);
      return;
    }
    void applyQueueOrder(updated);
  };

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25">
              <Sparkles size={21} />
            </div>
            <div>
              <p className="text-lg font-bold">TaskFlow</p>
              <p className="text-sm text-slate-400">
                Focus on what matters now.
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={17} />
            Add task
          </Button>
        </header>
        <nav className="mb-7 flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            ["today", "Today"],
            ["backlog", "Backlog"],
            ["history", "History"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id as "today" | "backlog" | "history")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                view === id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
        {view === "today" && (
          <>
            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#241251] via-[#48208a] to-[#8724bb] p-7 text-white shadow-xl shadow-violet-900/15">
              <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-3xl" />
              <div className="relative">
                {active ? (
                  <>
                    <p className="text-sm font-semibold text-violet-200">
                      ⚡ CURRENT FOCUS
                    </p>
                    <h1 className="mt-3 text-3xl font-bold">{active.title}</h1>
                    <p className="mt-2 text-violet-100">
                      {active.description ||
                        "Stay with this task until the next intentional switch."}
                    </p>
                    <Button
                      className="mt-6 bg-white text-violet-800 shadow-none hover:bg-violet-50"
                      onClick={handleDone}
                    >
                      <Check size={17} />
                      Mark as done
                    </Button>
                  </>
                ) : recommended ? (
                  <>
                    <p className="text-sm font-semibold text-fuchsia-200">
                      ✦ RECOMMENDED TASK
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold">
                        {recommended.title}
                      </h1>
                      <Badge className="bg-white/15 text-white">
                        #{recommended.queuePosition + 1} in queue
                      </Badge>
                    </div>
                    <p className="mt-2 text-violet-100">
                      {recommended.lastProgressNote ||
                        recommended.description ||
                        "First task in your manually ordered queue."}
                    </p>
                    <div className="mt-6 flex gap-3">
                      <Button
                        className="bg-white text-violet-800 shadow-none hover:bg-violet-50"
                        onClick={() => void startOrSwitch(recommended)}
                      >
                        <Play size={17} />
                        Start this task
                      </Button>
                      <Badge className={priorityStyle[recommended.priority]}>
                        {recommended.priority}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-violet-200">
                      ⚡ YOUR DAY
                    </p>
                    <h1 className="mt-3 text-3xl font-bold">
                      A clear day starts here.
                    </h1>
                    <p className="mt-2 text-violet-100">
                      Plan tasks, then decide exactly when to start.
                    </p>
                    <Button
                      className="mt-6 bg-white text-violet-800 shadow-none hover:bg-violet-50"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus size={17} />
                      Plan your day
                    </Button>
                  </>
                )}
              </div>
            </section>
            <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Today’s queue</h2>
                    <p className="text-sm text-slate-400">
                      Drag the ⠿ handle to reorder. Select a task name to view
                      details.
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">
                    {queue.length} tasks
                  </span>
                </div>
                {loading ? (
                  <div className="grid place-items-center rounded-3xl bg-white py-20">
                    <LoaderCircle className="animate-spin text-violet-500" />
                  </div>
                ) : queue.length ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onQueueDragEnd}
                  >
                    <SortableContext
                      items={queue.map((task) => task.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {queue.map((task) => (
                          <SortableTask
                            key={task.id}
                            task={task}
                            isRecommended={recommended?.id === task.id}
                            onOpen={setSelectedTask}
                            onDelete={setDeletingTask}
                            onMoveToBacklog={(task) =>
                              void handleMoveToBacklog(task)
                            }
                            onDone={(task) => void handleMarkDone(task)}
                            onStart={(task) => void startOrSwitch(task)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-12 text-center">
                    <Inbox className="mx-auto text-violet-500" />
                    <h3 className="mt-4 font-bold">Your queue is calm.</h3>
                    <Button className="mt-5" onClick={() => setAddOpen(true)}>
                      <Plus size={16} />
                      Plan your day
                    </Button>
                  </div>
                )}
              </div>
              <aside className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold tracking-widest text-slate-400">
                  FOCUS STATUS
                </p>
                <p className="mt-5 text-3xl font-bold">
                  {active ? "In focus" : "No task selected"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {active
                    ? "You can work on one task at a time. Complete or switch it before changing focus."
                    : "Press Start on a task to begin a focus session."}
                </p>
              </aside>
            </section>
          </>
        )}
        {view === "backlog" && (
          <BacklogView
            today={today()}
            queueSize={queue.length}
            onChanged={refresh}
          />
        )}
        {view === "history" && <HistoryView />}
      </div>
      <DailyCarryoverDialog
        date={today()}
        queueSize={queue.length}
        onChanged={refresh}
      />
      <Dialog open={addOpen} onOpenChange={closeModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogTitle className="text-xl font-bold">
            Plan your work
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            Choose one clear creation mode. Tasks in a multiple plan are always
            independent.
          </DialogDescription>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setInputMode("single")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-bold",
                inputMode === "single"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500",
              )}
            >
              Single Task
            </button>
            <button
              onClick={() => setInputMode("multiple")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-bold",
                inputMode === "multiple"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500",
              )}
            >
              Multiple Tasks
            </button>
          </div>
          {inputMode === "single" ? (
            <form className="mt-5 space-y-4" onSubmit={submitSingle}>
              <input
                autoFocus
                value={singleTitle}
                onChange={(event) => setSingleTitle(event.target.value)}
                placeholder="Task title *"
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-violet-300"
              />
              <textarea
                value={singleDescription}
                onChange={(event) => setSingleDescription(event.target.value)}
                placeholder="Description (optional)"
                className="min-h-24 w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-violet-300"
              />
              <div className="grid grid-cols-4 gap-2">
                {priorities.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setSinglePriority(item)}
                    className={cn(
                      "rounded-xl py-2 text-xs font-bold capitalize",
                      singlePriority === item
                        ? priorityStyle[item] +
                            " ring-2 ring-violet-400 ring-offset-2"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSingleAction("queue")}
                  className={cn(
                    "rounded-lg py-2 text-sm font-bold",
                    singleAction === "queue" &&
                      "bg-white text-violet-700 shadow-sm",
                  )}
                >
                  Add to Queue
                </button>
                <button
                  type="button"
                  onClick={() => setSingleAction("now")}
                  className={cn(
                    "rounded-lg py-2 text-sm font-bold",
                    singleAction === "now" &&
                      "bg-white text-violet-700 shadow-sm",
                  )}
                >
                  Start Now
                </button>
              </div>
              <Button className="w-full" type="submit">
                <Plus size={17} />
                {singleAction === "now"
                  ? "Create & start task"
                  : "Add task to queue"}
              </Button>
            </form>
          ) : multiStep === "input" ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-500">
                One line creates one independent task. You can review, reorder,
                edit and select one Start Now task next.
              </p>
              <textarea
                autoFocus
                value={multipleInput}
                onChange={(event) => setMultipleInput(event.target.value)}
                placeholder={
                  "Review proposal\nReply to client\nPrepare tomorrow's plan"
                }
                className="min-h-48 w-full rounded-xl border border-slate-200 p-4 font-medium outline-none focus:ring-2 focus:ring-violet-300"
              />
              <Button
                className="w-full"
                disabled={!multipleInput.trim()}
                onClick={reviewMultiple}
              >
                Review & arrange
                <ChevronRight size={17} />
              </Button>
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Review & arrange</h3>
                  <p className="text-sm text-slate-500">
                    Select Start now on at most one task.
                  </p>
                </div>
                <Badge className="bg-violet-100 text-violet-700">
                  {drafts.length} tasks
                </Badge>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDraftDragEnd}
              >
                <SortableContext
                  items={drafts.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {drafts.map((draft) => (
                      <SortableDraft
                        key={draft.id}
                        draft={draft}
                        update={(patch) =>
                          patch.startNow !== undefined
                            ? selectStart(draft.id)
                            : updateDraft(draft.id, patch)
                        }
                        remove={() =>
                          setDrafts((current) =>
                            current.filter((item) => item.id !== draft.id),
                          )
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" onClick={() => setMultiStep("input")}>
                  <ChevronLeft size={17} />
                  Edit list
                </Button>
                <Button
                  className="flex-1"
                  disabled={!drafts.length}
                  onClick={() => void createMultiple()}
                >
                  <Plus size={17} />
                  Create {drafts.length} task{drafts.length === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(pendingReorder)}
        onOpenChange={(open) => !open && setPendingReorder(null)}
      >
        <DialogContent>
          <DialogTitle className="text-xl font-bold">
            Move a new task ahead of unfinished work?
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            This To Do task will be placed ahead of a Pending task with
            unfinished context. It changes the next-task recommendation only; no
            task status will change.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPendingReorder(null)}>
              Keep current order
            </Button>
            <Button
              onClick={() => {
                if (pendingReorder) void applyQueueOrder(pendingReorder);
                setPendingReorder(null);
              }}
            >
              Move it ahead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deletingTask)}
        onOpenChange={(open) => !open && setDeletingTask(null)}
      >
        <DialogContent>
          <DialogTitle className="text-xl font-bold">
            Delete “{deletingTask?.title}”?
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            This permanently deletes the task and all of its related notes,
            interruptions and history.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingTask(null)}>
              Keep task
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => void handleDelete()}
            >
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(switching)}
        onOpenChange={(open) => !open && setSwitching(null)}
      >
        <DialogContent>
          <DialogTitle className="text-xl font-bold">
            Switch your focus
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            Pause “{active?.title}” and save a note before starting “
            {switching?.title}”.
          </DialogDescription>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-5 min-h-28 w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="What have you completed? What is the next step? (optional)"
          />
          <Button className="mt-4 w-full" onClick={() => void switchTaskNow()}>
            Save context & switch
            <ChevronRight size={17} />
          </Button>
        </DialogContent>
      </Dialog>
      <TaskDetailDialog
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdated={setSelectedTask}
        onChanged={refresh}
      />
    </main>
  );
}
export default App;
