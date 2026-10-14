import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import "./pinned.css";
import { PinnedReminderApp } from "./features/reminders/PinnedReminderApp";
import { applyTheme } from "./features/settings/theme";
import { getAppSettings } from "./features/settings/settingsRepository";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
void getAppSettings().catch(() => null).then((settings) => {
  applyTheme(settings?.theme);
  root.render(<React.StrictMode><PinnedReminderApp /></React.StrictMode>);
});
