import {
  BellRing,
  Keyboard,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { emit } from "@tauri-apps/api/event";
import { Button } from "../../components/ui/button";
import {
  getAppSettings,
  runRetentionCleanup,
  saveAppSettings,
  type AppSettings,
} from "./settingsRepository";
import { showPinnedReminder } from "../reminders/reminderRepository";
import { applyTheme, themes, type ThemeId } from "./theme";

export function SettingsView({
  onSaved,
}: {
  onSaved: (settings: AppSettings) => void;
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await getAppSettings();
        try {
          saved.launchAtLogin = await isEnabled();
        } catch {
          /* Plugin unavailable in browser preview. */
        }
        setSettings(saved);
      } catch (reason) {
        setError(String(reason));
      }
    })();
  }, []);

  const update = (patch: Partial<AppSettings>) =>
    setSettings((current) => current && { ...current, ...patch });
  const selectTheme = (theme: ThemeId) => {
    applyTheme(theme);
    void emit("theme-changed", theme);
    update({ theme });
  };
  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      try {
        settings.launchAtLogin ? await enable() : await disable();
      } catch (reason) {
        throw new Error(`Autostart could not be updated: ${String(reason)}`);
      }
      const saved = await saveAppSettings(settings);
      setSettings(saved);
      onSaved(saved);
      setMessage("Settings saved locally.");
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  };
  const cleanup = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const count = await runRetentionCleanup(settings.retentionDays);
      setMessage(`${count} archived task${count === 1 ? "" : "s"} removed.`);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  };
  if (!settings)
    return (
      <div className="grid place-items-center rounded-3xl bg-white py-24">
        <LoaderCircle className="animate-spin text-violet-500" />
      </div>
    );

  return (
    <section className="max-w-6xl">
      <div className="mb-7">
        <p className="text-sm font-bold tracking-[0.18em] text-violet-600">
          PREFERENCES
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-slate-500">
          Control reminders, privacy retention and desktop behavior.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SettingsCard
          icon={<Sparkles />}
          title="Appearance"
          description="Choose the color palette that feels right for your workspace."
          className="xl:col-span-2"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              Object.entries(themes) as [ThemeId, (typeof themes)[ThemeId]][]
            ).map(([id, theme]) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTheme(id)}
                className={`rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] ${settings.theme === id ? "border-[var(--color-primary)] bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-focus-ring)]" : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-accent)]"}`}
              >
                <ThemePreview theme={id} />
                <p className="mt-3 font-bold text-slate-800">{theme.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {theme.description}
                </p>
              </button>
            ))}
          </div>
        </SettingsCard>
        <SettingsCard
          icon={<BellRing />}
          title="Reminders"
          description="Show a pinned reminder and a native notification for paused work."
        >
          <Toggle
            checked={settings.remindersEnabled}
            onChange={(remindersEnabled) => update({ remindersEnabled })}
            label="Enable pending-task reminders"
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-semibold text-slate-700">
            <label htmlFor="reminder-interval">Repeat after</label>
            <input
              id="reminder-interval"
              type="number"
              min="5"
              max="1440"
              value={settings.reminderIntervalMinutes}
              onChange={(event) =>
                update({ reminderIntervalMinutes: Number(event.target.value) })
              }
              className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center outline-none focus:ring-2 focus:ring-violet-300"
            />
            <span>minutes</span>
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full sm:w-auto"
            onClick={() =>
              void showPinnedReminder()
                .then(() => setMessage("Reminder is visible again."))
                .catch((reason) => setError(String(reason)))
            }
          >
            Show reminder now
          </Button>
        </SettingsCard>

        <SettingsCard
          icon={<Keyboard />}
          title="Quick Add"
          description="Open the task planner from anywhere on Windows."
        >
          <label className="block text-sm font-semibold text-slate-700">
            Global shortcut
            <input
              value={settings.quickAddShortcut}
              onChange={(event) =>
                update({ quickAddShortcut: event.target.value })
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="CommandOrControl+Shift+Space"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Use Tauri shortcut syntax, for example{" "}
            <code>CommandOrControl+Shift+Space</code>.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={<ShieldCheck />}
          title="Desktop lifecycle"
          description="Keep TaskFlow available from the system tray."
        >
          <Toggle
            checked={settings.launchAtLogin}
            onChange={(launchAtLogin) => update({ launchAtLogin })}
            label="Launch TaskFlow when I sign in"
          />
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Closing the window hides it to the tray. Use Quit from the tray menu
            to exit.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={<Trash2 />}
          title="History retention"
          description="Completed and archived tasks are kept locally until cleanup."
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-semibold text-slate-700">
            <label htmlFor="retention-days">Keep history for</label>
            <input
              id="retention-days"
              type="number"
              min="1"
              max="3650"
              value={settings.retentionDays}
              onChange={(event) =>
                update({ retentionDays: Number(event.target.value) })
              }
              className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center outline-none focus:ring-2 focus:ring-violet-300"
            />
            <span>days</span>
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full sm:w-auto"
            onClick={() => void cleanup()}
            disabled={saving}
          >
            <Trash2 size={16} />
            Run cleanup now
          </Button>
        </SettingsCard>
      </div>

      <div className="mt-6 flex justify-stretch sm:justify-end">
        <Button
          className="w-full sm:w-auto"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving && <LoaderCircle size={16} className="animate-spin" />}Save
          settings
        </Button>
      </div>
    </section>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm ${className}`}
    >
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ThemePreview({ theme }: { theme: ThemeId }) {
  return (
    <div data-preview-theme={theme} className="theme-preview rounded-xl p-2">
      <div className="theme-preview-primary h-4 rounded-full" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-white p-2">
          <div className="theme-preview-soft h-3 rounded" />
        </div>
        <div className="rounded-md bg-white p-2">
          <div className="theme-preview-primary h-3 rounded" />
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-violet-600" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </label>
  );
}
