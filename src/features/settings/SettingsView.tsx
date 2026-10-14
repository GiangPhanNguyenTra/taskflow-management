import { BellRing, Keyboard, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { Button } from "../../components/ui/button";
import { getAppSettings, runRetentionCleanup, saveAppSettings, type AppSettings } from "./settingsRepository";
import { showPinnedReminder } from "../reminders/reminderRepository";

export function SettingsView({ onSaved }: { onSaved: (settings: AppSettings) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await getAppSettings();
        try { saved.launchAtLogin = await isEnabled(); } catch { /* Plugin unavailable in browser preview. */ }
        setSettings(saved);
      } catch (reason) { setError(String(reason)); }
    })();
  }, []);

  const update = (patch: Partial<AppSettings>) => setSettings((current) => current && { ...current, ...patch });
  const save = async () => {
    if (!settings) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      try { settings.launchAtLogin ? await enable() : await disable(); } catch (reason) { throw new Error(`Autostart could not be updated: ${String(reason)}`); }
      const saved = await saveAppSettings(settings);
      setSettings(saved); onSaved(saved); setMessage("Settings saved locally.");
    } catch (reason) { setError(String(reason)); }
    finally { setSaving(false); }
  };
  const cleanup = async () => {
    if (!settings) return;
    setSaving(true); setMessage(null); setError(null);
    try { const count = await runRetentionCleanup(settings.retentionDays); setMessage(`${count} archived task${count === 1 ? "" : "s"} removed.`); }
    catch (reason) { setError(String(reason)); }
    finally { setSaving(false); }
  };
  if (!settings) return <div className="grid place-items-center rounded-3xl bg-white py-24"><LoaderCircle className="animate-spin text-violet-500" /></div>;
  return <section className="max-w-3xl"><div className="mb-7"><p className="text-sm font-bold tracking-[0.18em] text-violet-600">PREFERENCES</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1><p className="mt-2 text-slate-500">Control reminders, privacy retention and desktop behavior.</p></div>{error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}<div className="space-y-4"><SettingsCard icon={<BellRing />} title="Reminders" description="Show a pinned reminder and a native notification for paused work."><Toggle checked={settings.remindersEnabled} onChange={(remindersEnabled) => update({ remindersEnabled })} label="Enable pending-task reminders" /><label className="mt-4 block text-sm font-semibold text-slate-700">Repeat after <input type="number" min="5" max="1440" value={settings.reminderIntervalMinutes} onChange={(event) => update({ reminderIntervalMinutes: Number(event.target.value) })} className="mx-2 h-9 w-20 rounded-lg border border-slate-200 px-2 text-center outline-none focus:ring-2 focus:ring-violet-300" /> minutes</label><Button variant="outline" className="mt-4" onClick={() => void showPinnedReminder().then(() => setMessage("Reminder is visible again.")).catch((reason) => setError(String(reason)))}>Show reminder now</Button></SettingsCard><SettingsCard icon={<Keyboard />} title="Quick Add" description="Open the task planner from anywhere on Windows."><label className="block text-sm font-semibold text-slate-700">Global shortcut<input value={settings.quickAddShortcut} onChange={(event) => update({ quickAddShortcut: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-violet-300" placeholder="CommandOrControl+Shift+Space" /></label><p className="mt-2 text-xs leading-5 text-slate-500">Use Tauri shortcut syntax, for example <code>CommandOrControl+Shift+Space</code>.</p></SettingsCard><SettingsCard icon={<ShieldCheck />} title="Desktop lifecycle" description="Keep TaskFlow available from the system tray."><Toggle checked={settings.launchAtLogin} onChange={(launchAtLogin) => update({ launchAtLogin })} label="Launch TaskFlow when I sign in" /><p className="mt-3 text-xs text-slate-500">Closing the window hides it to the tray. Use Quit from the tray menu to exit.</p></SettingsCard><SettingsCard icon={<Trash2 />} title="History retention" description="Completed and archived tasks are kept locally until cleanup."><label className="block text-sm font-semibold text-slate-700">Keep history for <input type="number" min="1" max="3650" value={settings.retentionDays} onChange={(event) => update({ retentionDays: Number(event.target.value) })} className="mx-2 h-9 w-20 rounded-lg border border-slate-200 px-2 text-center outline-none focus:ring-2 focus:ring-violet-300" /> days</label><Button variant="outline" className="mt-4" onClick={() => void cleanup()} disabled={saving}><Trash2 size={16} />Run cleanup now</Button></SettingsCard></div><div className="mt-6 flex justify-end"><Button onClick={() => void save()} disabled={saving}>{saving && <LoaderCircle size={16} className="animate-spin" />}Save settings</Button></div></section>;
}

function SettingsCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">{icon}</span><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></div><div className="mt-5">{children}</div></section>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4"><span className="text-sm font-semibold text-slate-700">{label}</span><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-violet-600" : "bg-slate-200"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button></label>;
}
