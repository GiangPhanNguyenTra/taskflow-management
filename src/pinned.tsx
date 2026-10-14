import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import "./pinned.css";
import { PinnedReminderApp } from "./features/reminders/PinnedReminderApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PinnedReminderApp />
  </React.StrictMode>,
);
