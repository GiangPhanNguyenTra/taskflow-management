import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { Task, TaskPriority } from "../../shared/task";
import { TaskDetailDialog } from "../tasks/TaskDetailDialog";
import { listHistoryPage, type HistorySummary } from "../tasks/taskRepository";

type Preset =
  | "today"
  | "yesterday"
  | "week"
  | "lastWeek"
  | "month"
  | "lastMonth"
  | "last7"
  | "last30"
  | "custom";
type Sort =
  | "completed_newest"
  | "completed_oldest"
  | "priority_highest"
  | "priority_lowest";
const priorities: TaskPriority[] = ["urgent", "high", "medium", "low"];
const priorityClass: Record<TaskPriority, string> = {
  urgent: "bg-rose-100 text-rose-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-sky-100 text-sky-700",
  low: "bg-slate-100 text-slate-600",
};
const colors: Record<TaskPriority, string> = {
  urgent: "#fb7185",
  high: "#fb923c",
  medium: "#60a5fa",
  low: "#94a3b8",
};
const emptySummary: HistorySummary = {
  trend: [],
  priorityDistribution: [],
  statusDistribution: [],
};
const startDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const prettyDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const activityAt = (task: Task) =>
  task.completedAt ??
  (task.plannedDate ? `${task.plannedDate}T12:00:00` : task.updatedAt);
const statusClass: Record<Task["status"], string> = {
  todo: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  pending: "bg-orange-100 text-orange-700",
  done: "bg-emerald-100 text-emerald-700",
};
function rangeFor(preset: Preset, current = new Date()) {
  const today = startDay(current),
    mondayOffset = (today.getDay() + 6) % 7;
  if (preset === "yesterday") return { start: addDays(today, -1), end: today };
  if (preset === "week")
    return { start: addDays(today, -mondayOffset), end: addDays(today, 1) };
  if (preset === "lastWeek") {
    const end = addDays(today, -mondayOffset);
    return { start: addDays(end, -7), end };
  }
  if (preset === "month")
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: addDays(today, 1),
    };
  if (preset === "lastMonth")
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 1),
    };
  if (preset === "last7")
    return { start: addDays(today, -6), end: addDays(today, 1) };
  if (preset === "last30")
    return { start: addDays(today, -29), end: addDays(today, 1) };
  return { start: today, end: addDays(today, 1) };
}
function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </article>
  );
}

export function HistoryView({ onChanged }: { onChanged: () => Promise<void> }) {
  const [preset, setPreset] = useState<Preset>("today");
  const [range, setRange] = useState(() => rangeFor("today"));
  const [priority, setPriority] = useState<"" | TaskPriority>("");
  const [status, setStatus] = useState<
    "" | "todo" | "in_progress" | "pending" | "done"
  >("");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<Sort>("completed_newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(
    () => setPage(1),
    [range.start, range.end, priority, status, searchQuery, sort, pageSize],
  );
  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listHistoryPage({
        startAt: range.start.toISOString(),
        endAt: range.end.toISOString(),
        startDate: dateInput(range.start),
        endDate: dateInput(range.end),
        priority: priority || undefined,
        status: status || undefined,
        search: searchQuery || undefined,
        sort,
        page,
        pageSize,
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
      });
      setTasks(data.tasks);
      setTotal(data.total);
      setSummary(data.summary);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [
    range.start,
    range.end,
    priority,
    status,
    searchQuery,
    sort,
    page,
    pageSize,
  ]);
  const setPeriod = (value: Preset) => {
    setPreset(value);
    if (value !== "custom") setRange(rangeFor(value));
  };
  const reset = () => {
    setPriority("");
    setStatus("");
    setSearch("");
    setSearchQuery("");
    setSort("completed_newest");
  };
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const grouped = useMemo(
    () =>
      tasks.reduce<Record<string, Task[]>>((all, task) => {
        const d = new Date(activityAt(task));
        const key = dateInput(d);
        (all[key] ??= []).push(task);
        return all;
      }, {}),
    [tasks],
  );
  const distribution = priorities.map((priority) => ({
    priority,
    count:
      summary.priorityDistribution.find((item) => item.priority === priority)
        ?.count ?? 0,
  }));
  const distributionTotal = distribution.reduce((n, item) => n + item.count, 0);
  const statusItems = ["todo", "in_progress", "pending", "done"] as const;
  const statusTotal = summary.statusDistribution.reduce(
    (n, item) => n + item.count,
    0,
  );
  const statusCount = (status: (typeof statusItems)[number]) =>
    summary.statusDistribution.find((item) => item.status === status)?.count ??
    0;
  const maxTrend = Math.max(1, ...summary.trend.map((item) => item.count));
  const gradient = distributionTotal
    ? `conic-gradient(${distribution
        .reduce<string[]>((stops, item, index) => {
          const before = distribution
            .slice(0, index)
            .reduce((n, part) => n + part.count, 0);
          return item.count
            ? [
                ...stops,
                `${colors[item.priority]} ${(before / distributionTotal) * 100}% ${((before + item.count) / distributionTotal) * 100}%`,
              ]
            : stops;
        }, [])
        .join(", ")})`
    : "#e2e8f0";
  const presets: [Preset, string][] = [
    ["today", "Today"],
    ["week", "This week"],
    ["month", "This month"],
    ["last30", "Last 30 days"],
  ];
  return (
    <section className="min-w-0 pb-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-violet-600">
            PRODUCTIVITY
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-2 text-slate-500">
            Understand completed work, planned workload and focus status.
          </p>
        </div>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
          <CalendarDays className="mr-2 inline h-4 w-4 text-violet-600" />
          {prettyDate(range.start)}
          {range.end.getTime() - range.start.getTime() > 86400000 &&
            ` – ${prettyDate(addDays(range.end, -1))}`}
        </p>
      </header>
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${preset === id ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-violet-50"}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriod("custom")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${preset === "custom" ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-600"}`}
          >
            Custom range
          </button>
          {preset === "today" && (
            <span className="ml-auto flex">
              <button
                aria-label="Previous day"
                onClick={() => {
                  const next = addDays(range.start, -1);
                  setRange({ start: next, end: addDays(next, 1) });
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-violet-50"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                aria-label="Next day"
                onClick={() => {
                  const next = addDays(range.start, 1);
                  setRange({ start: next, end: addDays(next, 1) });
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-violet-50"
              >
                <ChevronRight size={17} />
              </button>
            </span>
          )}
        </div>
        {preset === "custom" && (
          <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
            <label className="text-xs font-bold text-slate-500">
              From{" "}
              <input
                type="date"
                value={dateInput(range.start)}
                onChange={(e) => {
                  const start = parseDate(e.target.value);
                  setRange({
                    start,
                    end: range.end <= start ? addDays(start, 1) : range.end,
                  });
                }}
                className="ml-1 rounded-lg border border-slate-200 p-2"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              To{" "}
              <input
                type="date"
                value={dateInput(addDays(range.end, -1))}
                min={dateInput(range.start)}
                onChange={(e) =>
                  setRange({
                    start: range.start,
                    end: addDays(parseDate(e.target.value), 1),
                  })
                }
                className="ml-1 rounded-lg border border-slate-200 p-2"
              />
            </label>
          </div>
        )}
      </div>
      {loadError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Analytics could not be loaded: {loadError}
        </div>
      )}
      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Overview</h2>
          <span className="text-sm text-slate-400">
            {total
              ? `${Math.round((statusCount("done") / total) * 100)}% complete in this range`
              : "No tasks in this range"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total tasks" value={total} color="text-violet-600" />
          <Stat
            label="To do"
            value={statusCount("todo")}
            color="text-sky-600"
          />
          <Stat
            label="In progress"
            value={statusCount("in_progress")}
            color="text-amber-600"
          />
          <Stat
            label="Pending"
            value={statusCount("pending")}
            color="text-orange-600"
          />
          <Stat
            label="Done"
            value={statusCount("done")}
            color="text-emerald-600"
          />
        </div>
      </section>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="flex items-center gap-2 font-bold">
            <BarChart3 size={18} className="text-violet-600" />
            Analytics
          </span>
          <span className="text-sm text-slate-400">
            {analyticsOpen ? "Hide" : "Show"}
          </span>
        </button>
        {analyticsOpen && (
          <div className="grid gap-6 border-t border-slate-100 p-5 xl:grid-cols-[1.35fr_1fr_1fr]">
            <div>
              <p className="text-sm font-bold">Completion trend</p>
              {summary.trend.length ? (
                <div className="mt-5 flex h-36 items-end gap-2">
                  {summary.trend.map((point) => (
                    <div
                      key={point.date}
                      className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                    >
                      <div
                        title={`${point.date}: ${point.count} completed`}
                        style={{
                          height: `${Math.max(8, (point.count / maxTrend) * 100)}%`,
                        }}
                        className="rounded-t-md bg-violet-500 group-hover:opacity-75"
                      />
                      <span className="mt-2 truncate text-center text-[10px] text-slate-400">
                        {point.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-8 text-sm text-slate-400">
                  No completed tasks in this range.
                </p>
              )}
            </div>
            <div className="border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-sm font-bold">Priority distribution</p>
              {distributionTotal ? (
                <div className="mt-4 flex items-center gap-5">
                  <div
                    className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
                    style={{ background: gradient }}
                  >
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center text-xs font-bold">
                      {distributionTotal}
                      <span className="-mt-3 text-[10px] font-normal text-slate-400">
                        tasks
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {distribution
                      .filter((item) => item.count)
                      .map((item) => (
                        <div
                          key={item.priority}
                          className="flex min-w-36 items-center justify-between gap-3 text-xs"
                        >
                          <span className="capitalize text-slate-600">
                            <i
                              className="mr-1.5 inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: colors[item.priority] }}
                            />
                            {item.priority}
                          </span>
                          <b>
                            {item.count} ·{" "}
                            {Math.round((item.count / distributionTotal) * 100)}
                            %
                          </b>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="mt-8 text-sm text-slate-400">
                  No tasks to distribute.
                </p>
              )}
            </div>
            <div className="border-t border-slate-100 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <p className="text-sm font-bold">Status mix</p>
              {statusTotal ? (
                <div className="mt-4 space-y-3">
                  {statusItems.map((item) => {
                    const count =
                      summary.statusDistribution.find(
                        (point) => point.status === item,
                      )?.count ?? 0;
                    const label =
                      item === "in_progress"
                        ? "In progress"
                        : item === "todo"
                          ? "To do"
                          : item[0].toUpperCase() + item.slice(1);
                    return (
                      <div key={item}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-medium text-slate-600">
                            {label}
                          </span>
                          <b>{count}</b>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item === "done" ? "bg-emerald-500" : item === "in_progress" ? "bg-amber-500" : item === "pending" ? "bg-orange-400" : "bg-sky-500"}`}
                            style={{ width: `${(count / statusTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-8 text-sm text-slate-400">
                  No tasks in this range.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
      <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <label className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description…"
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
          />
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "" | TaskPriority)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p[0].toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) =>
            setStatus(
              e.target.value as
                | ""
                | "todo"
                | "in_progress"
                | "pending"
                | "done",
            )
          }
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="completed_newest">Newest activity</option>
          <option value="completed_oldest">Oldest activity</option>
          <option value="priority_highest">Priority: highest</option>
          <option value="priority_lowest">Priority: lowest</option>
        </select>
        <Button variant="ghost" className="text-slate-500" onClick={reset}>
          <X size={16} />
          Clear
        </Button>
      </div>
      <section className="mt-5">
        <div className="mb-3">
          <h2 className="text-xl font-bold">Tasks in range</h2>
          <p className="text-sm text-slate-500">
            {total} task{total === 1 ? "" : "s"} matching the selected analysis
          </p>
        </div>
        {loading ? (
          <div className="grid place-items-center rounded-3xl bg-white py-20">
            <LoaderCircle className="animate-spin text-violet-500" />
          </div>
        ) : tasks.length ? (
          <div className="space-y-5">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <h3 className="mb-2 font-bold text-slate-700">
                  {date === dateInput(new Date())
                    ? "Today"
                    : prettyDate(parseDate(date))}{" "}
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {items.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {items.map((task) => (
                    <article
                      key={task.id}
                      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-violet-200"
                    >
                      <CheckCircle2
                        className="mt-0.5 text-emerald-500"
                        size={19}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className="text-left font-bold hover:text-violet-700 hover:underline"
                        >
                          {task.title}
                        </button>
                        {task.description && (
                          <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge className={priorityClass[task.priority]}>
                            {task.priority}
                          </Badge>
                          <Badge className={statusClass[task.status]}>
                            {task.status === "in_progress"
                              ? "In progress"
                              : task.status === "todo"
                                ? "To do"
                                : task.status[0].toUpperCase() +
                                  task.status.slice(1)}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(activityAt(task)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="shrink-0 text-sm font-bold text-violet-600 hover:underline"
                      >
                        Details
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-14 text-center">
            <Clock3 className="mx-auto text-violet-500" />
            <h2 className="mt-4 font-bold">No matching tasks.</h2>
            <p className="mt-1 text-sm text-slate-500">
              Try another date range or clear the filters.
            </p>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <label className="text-sm text-slate-500">
            Show{" "}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="ml-1 rounded-lg border border-slate-200 bg-white p-1 text-slate-700"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>{" "}
            per page
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= pages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>
      <TaskDetailDialog
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdated={setSelectedTask}
        onChanged={async () => {
          await load();
          await onChanged();
        }}
      />
    </section>
  );
}
