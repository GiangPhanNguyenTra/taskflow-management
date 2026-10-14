import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { PinnedReminderApp } from "./features/reminders/PinnedReminderApp";
import { applyTheme } from "./features/settings/theme";
import { getAppSettings } from "./features/settings/settingsRepository";

declare global {
  interface Window {
    __TASKFLOW_IS_PINNED__?: boolean;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
void getAppSettings().catch(() => null).then((settings) => {
  applyTheme(settings?.theme);
  root.render(<React.StrictMode>{window.__TASKFLOW_IS_PINNED__ ? <PinnedReminderApp /> : <App />}</React.StrictMode>);
});
