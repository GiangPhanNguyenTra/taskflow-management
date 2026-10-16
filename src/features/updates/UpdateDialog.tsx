import { check, type Update } from "@tauri-apps/plugin-updater";
import { Download, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";

type Status = "checking" | "available" | "downloading" | "error";

export function UpdateDialog() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<Status>("checking");
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [contentLength, setContentLength] = useState<number | undefined>();
  const updateRef = useRef<Update | null>(null);

  useEffect(() => {
    let cancelled = false;
    const findUpdate = async () => {
      try {
        const nextUpdate = await check({ timeout: 15_000 });
        if (cancelled) {
          await nextUpdate?.close();
          return;
        }
        updateRef.current = nextUpdate;
        setUpdate(nextUpdate);
        if (nextUpdate) setStatus("available");
      } catch {
        // A missing network connection or unavailable release service must not block the app.
      }
    };
    void findUpdate();
    return () => {
      cancelled = true;
      const pendingUpdate = updateRef.current;
      if (pendingUpdate) void pendingUpdate.close();
    };
  }, []);

  const dismiss = () => {
    const pendingUpdate = updateRef.current;
    updateRef.current = null;
    setUpdate(null);
    if (pendingUpdate) void pendingUpdate.close();
  };

  const install = async () => {
    if (!update) return;
    setStatus("downloading");
    setDownloadedBytes(0);
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") setContentLength(event.data.contentLength);
        if (event.event === "Progress") setDownloadedBytes((current) => current + event.data.chunkLength);
      });
    } catch {
      setStatus("error");
    }
  };

  const percent = contentLength
    ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
    : undefined;

  return (
    <Dialog open={Boolean(update)} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-700">
          {status === "downloading" ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
        </div>
        <DialogTitle className="mt-4 text-xl font-bold">Có bản cập nhật mới</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
          TaskFlow {update?.version} đã sẵn sàng. Cập nhật giúp bạn có các cải tiến và sửa lỗi mới nhất.
        </DialogDescription>
        {update?.body && (
          <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{update.body}</p>
        )}
        {status === "downloading" && (
          <div className="mt-5 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-600 transition-[width]" style={{ width: percent === undefined ? "35%" : `${percent}%` }} />
            </div>
            <p className="text-center text-xs font-medium text-slate-500">
              {percent === undefined ? "Đang tải bản cập nhật…" : `Đang tải: ${percent}%`}
            </p>
          </div>
        )}
        {status === "error" && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Không thể tải bản cập nhật. Vui lòng thử lại sau.</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          {status !== "downloading" && <Button variant="outline" onClick={dismiss}>Để sau</Button>}
          <Button disabled={status === "downloading"} onClick={() => void install()}>
            {status === "downloading" ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />}
            {status === "error" ? "Thử lại" : "Cập nhật ngay"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
