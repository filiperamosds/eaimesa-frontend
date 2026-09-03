"use client";

import { useEffect } from "react";

const KEY = "eaimesa-chunk-reload";

function isChunkError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

/** Depois do rsync --delete os hashes velhos somem; um tab aberto 404 nos chunks. Recarrega uma vez. */
export function ChunkLoadRecovery() {
  useEffect(() => {
    function reloadOnce() {
      try {
        const last = Number(sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < 20_000) return;
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* private mode */
      }
      window.location.reload();
    }

    function onError(e: ErrorEvent) {
      if (isChunkError(e.error) || isChunkError(e.message)) reloadOnce();
    }
    function onRejection(e: PromiseRejectionEvent) {
      if (isChunkError(e.reason)) reloadOnce();
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
