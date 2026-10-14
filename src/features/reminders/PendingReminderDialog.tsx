import { BellRing, Play } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import type { Task } from "../../shared/task";

export function PendingReminderDialog({
  task,
  open,
  onOpenChange,
  onResume,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: (task: Task) => void;
}) {
  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-600">
          <BellRing size={20} />
        </div>
        <DialogTitle className="mt-4 text-xl font-bold">
          A task is waiting for you
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-slate-500">
          You paused this task earlier. Resume it when you are ready, or keep it
          safely in your queue.
        </DialogDescription>
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-950">{task.title}</p>
          <p className="mt-1 text-sm text-amber-800">
            {task.lastProgressNote ||
              task.description ||
              "No progress note saved."}
          </p>
        </section>
        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Keep in queue
          </Button>
          <Button className="flex-1" onClick={() => onResume(task)}>
            <Play size={16} />
            Resume task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
