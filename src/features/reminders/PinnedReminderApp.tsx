import {
  BellRing,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  FileText,
  Minus,
  Play,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { applyTheme } from "../settings/theme";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  getPinnedReminder,
  hidePinnedReminder,
  openMainWindow,
  resumeReminderTask,
  setPinnedReminderCompact,
  setPinnedReminderContentHeight,
  setPinnedReminderSwitching,
  snoozePinnedReminder,
  type PinnedReminderPayload,
} from "./reminderRepository";

type Disposition = "pending" | "done";

function DragRegions({
  onMouseDown,
}: {
  onMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        onMouseDown={onMouseDown}
        className="absolute inset-x-3 top-0 z-10 h-3 cursor-grab active:cursor-grabbing"
      />
      <div
        aria-hidden="true"
        onMouseDown={onMouseDown}
        className="absolute inset-y-3 left-0 z-10 w-2 cursor-grab active:cursor-grabbing"
      />
      <div
        aria-hidden="true"
        onMouseDown={onMouseDown}
        className="absolute inset-y-3 right-0 z-10 w-2 cursor-grab active:cursor-grabbing"
      />
    </>
  );
}

export function PinnedReminderApp() {
  const [payload, setPayload] = useState<PinnedReminderPayload | null>(null);
  const [compact, setCompact] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [disposition, setDisposition] = useState<Disposition>("pending");
  const [progressNote, setProgressNote] = useState("");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void getPinnedReminder()
      .then(setPayload)
      .catch(() => undefined);
    let unlisten: (() => void) | undefined;
    void listen<PinnedReminderPayload | null>(
      "pinned-reminder:update",
      (event) => {
        setPayload(event.payload);
        setSwitching(false);
        setSnoozeOpen(false);
      },
    ).then((stop) => {
      unlisten = stop;
    });
    let stopTheme: (() => void) | undefined;
    void listen<string>("theme-changed", (event) =>
      applyTheme(event.payload),
    ).then((stop) => {
      stopTheme = stop;
    });
    return () => {
      unlisten?.();
      stopTheme?.();
    };
  }, []);

  const setMode = async (next: boolean) => {
    setCompact(next);
    try {
      await setPinnedReminderCompact(next);
    } catch {
      setCompact(!next);
    }
  };
  const beginDrag = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    void getCurrentWindow()
      .startDragging()
      .catch(() => undefined);
  };
  const beginCompactDrag = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button"))
      return;
    void getCurrentWindow()
      .startDragging()
      .catch(() => undefined);
  };

  useLayoutEffect(() => {
    if (compact || !contentRef.current) return;
    const content = contentRef.current;
    let frame = 0;
    const resizeToContent = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        void setPinnedReminderContentHeight(Math.ceil(content.scrollHeight));
      });
    };
    const observer = new ResizeObserver(resizeToContent);
    observer.observe(content);
    resizeToContent();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [compact, payload, switching, snoozeOpen]);
  const snooze = async (minutes: number) => {
    if (!payload?.pending) return;
    setWorking(true);
    try {
      await snoozePinnedReminder(payload.pending.id, minutes);
    } finally {
      setWorking(false);
      setSnoozeOpen(false);
    }
  };
  const resume = async () => {
    if (!payload?.pending) return;
    if (payload.active) {
      setSwitching(true);
      void setPinnedReminderSwitching(true);
      return;
    }
    setWorking(true);
    try {
      await resumeReminderTask(payload.pending.id);
    } finally {
      setWorking(false);
    }
  };
  const confirmResume = async () => {
    if (!payload?.pending) return;
    setWorking(true);
    try {
      await resumeReminderTask(
        payload.pending.id,
        payload.active?.id,
        disposition,
        progressNote,
      );
    } finally {
      setWorking(false);
      setSwitching(false);
      void setPinnedReminderSwitching(false);
    }
  };

  if (compact)
    return (
      <main
        onMouseDown={beginCompactDrag}
        className="flex h-screen w-screen cursor-grab select-none items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-xl shadow-slate-950/20 active:cursor-grabbing"
      >
        <BellRing size={21} className="shrink-0 self-center text-violet-600" />
        <span className="ml-3 flex-1 leading-none text-sm font-semibold text-slate-700">
          1 pending
        </span>
        <button
          type="button"
          onClick={() => void setMode(false)}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 hover:bg-violet-50"
          aria-label="Expand reminder"
        >
          <ChevronUp size={18} />
        </button>
        <button
          type="button"
          onClick={() => void hidePinnedReminder()}
          className="grid h-8 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          aria-label="Hide reminder"
        >
          <X size={18} />
        </button>
      </main>
    );
  if (!payload?.pending) return <main className="h-screen bg-transparent" />;

  if (switching && payload.active)
    return (
      <main
        ref={contentRef}
        className="relative rounded-2xl border border-violet-200 bg-white p-5 shadow-2xl shadow-violet-950/20"
      >
        <DragRegions onMouseDown={beginDrag} />
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
          Switch focus
        </p>
        <h1 className="mt-2 text-lg font-bold text-slate-900">
          What should happen to “{payload.active.title}”?
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Save context before resuming “{payload.pending.title}”.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDisposition("pending")}
            className={`rounded-xl border p-3 text-left text-sm font-semibold ${disposition === "pending" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600"}`}
          >
            Keep as Pending
          </button>
          <button
            type="button"
            onClick={() => setDisposition("done")}
            className={`rounded-xl border p-3 text-left text-sm font-semibold ${disposition === "done" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}
          >
            Mark as Done
          </button>
        </div>
        {disposition === "pending" && (
          <textarea
            value={progressNote}
            onChange={(event) => setProgressNote(event.target.value)}
            className="mt-3 h-16 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"
            placeholder="What is the next step? (optional)"
          />
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setSwitching(false);
              void setPinnedReminderSwitching(false);
            }}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            Back
          </button>
          <button
            type="button"
            disabled={working}
            onClick={() => void confirmResume()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            <Play size={14} fill="currentColor" />
            {working ? "Saving…" : "Continue & resume"}
          </button>
        </div>
      </main>
    );

  return (
    <main
      ref={contentRef}
      className="relative overflow-y-auto rounded-2xl border border-violet-200 bg-white p-5 shadow-2xl shadow-violet-950/20"
    >
      <DragRegions onMouseDown={beginDrag} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <BellRing size={14} className="text-violet-600" />
            TaskFlow reminder
          </p>
          {payload.active && (
            <p className="mt-2 truncate text-xs text-slate-400">
              Working on: {payload.active.title}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <h1 className="truncate text-lg font-bold text-slate-900">
              {payload.pending.title}
            </h1>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
              Pending
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Pending for now — return when you are ready.
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => void setMode(true)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-violet-50"
            aria-label="Minimize reminder"
          >
            <Minus size={17} />
          </button>
          <button
            type="button"
            onClick={() => void hidePinnedReminder()}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Hide reminder"
          >
            <X size={17} />
          </button>
        </div>
      </div>
      {payload.pending.detail && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs text-slate-500">
          <FileText size={15} className="text-violet-500" />
          Last note: {payload.pending.detail}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={working}
          onClick={() => void resume()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm shadow-violet-300 disabled:opacity-50"
        >
          <Play size={14} fill="currentColor" />
          Resume now
        </button>
        {snoozeOpen ? (
          <div className="flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => void snooze(15)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              15m
            </button>
            <button
              type="button"
              onClick={() => void snooze(30)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              30m
            </button>
            <button
              type="button"
              onClick={() => void snooze(60)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              1h
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={working}
            onClick={() => setSnoozeOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600"
          >
            <Clock3 size={15} />
            Snooze <ChevronDown size={14} />
          </button>
        )}
        <span className="h-6 w-px bg-slate-200" />
        <button
          type="button"
          onClick={() => void openMainWindow()}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
        >
          Open TaskFlow <ExternalLink size={13} />
        </button>
      </div>
    </main>
  );
}
