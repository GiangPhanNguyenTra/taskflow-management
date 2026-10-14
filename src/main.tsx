import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { PinnedReminderApp } from "./features/reminders/PinnedReminderApp";

declare global {
  interface Window {
    __TASKFLOW_IS_PINNED__?: boolean;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {window.__TASKFLOW_IS_PINNED__ ? <PinnedReminderApp /> : <App />}
  </React.StrictMode>,
);
